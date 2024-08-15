import { countExperience, realCardLevel } from "@/utils/card-utils";
import { DECK_SIZE_ADJUSTMENTS, SPECIAL_CARD_CODES } from "@/utils/constants";
import { range } from "@/utils/range";
import type { Card } from "../services/queries.types";
import type { Customization, ResolvedDeck } from "./types";

type Changes = {
  slots: Record<string, number>;
  extraSlots: Record<string, number>;
  customizations: Record<string, Customization[]>;
};

export type UpgradeStats = {
  changes: Changes;
  xpAvailable: number;
  xpAdjustment: number;
  xpSpent: number;
  xp: number;
};

export function getUpgradeStats(
  prev: ResolvedDeck,
  next: ResolvedDeck,
): UpgradeStats {
  const changes = deckChanges(prev, next);

  const xp = next.xp ?? 0;
  const xpAdjustment = next.xp_adjustment ?? 0;

  const xpSpent = calculateXpSpent(prev, next, changes);
  const xpAvailable = xp + xpAdjustment - xpSpent;

  return {
    changes,
    xpAvailable,
    xpAdjustment,
    xpSpent,
    xp,
  };
}

function deckChanges(prev: ResolvedDeck, next: ResolvedDeck): Changes {
  return {
    customizations: getCustomizableChanges(prev, next),
    extraSlots: getSlotChanges(prev, next, "extraSlots"),
    slots: getSlotChanges(prev, next, "slots"),
  };
}

function getSlotChanges(
  prev: ResolvedDeck,
  next: ResolvedDeck,
  slotKey: "slots" | "extraSlots",
) {
  const differences: Record<string, number> = {};

  for (const code of new Set([
    ...Object.keys(prev[slotKey] ?? {}),
    ...Object.keys(next[slotKey] ?? {}),
  ])) {
    const nextQuantity = next?.[slotKey]?.[code] ?? 0;
    const prevQuantity = prev?.[slotKey]?.[code] ?? 0;

    // XXX: holds until extra deck and main deck can contain the same exilable card.
    if (next.exileSlots[code]) {
      const exileDiff = nextQuantity - (prevQuantity - next.exileSlots[code]);

      if (exileDiff !== 0) differences[code] = exileDiff;
    } else {
      const diff = nextQuantity - prevQuantity;
      if (diff !== 0) differences[code] = diff;
    }
  }

  return differences;
}

function getCustomizableChanges(prev: ResolvedDeck, next: ResolvedDeck) {
  const customizableDifferences: Record<string, Customization[]> = {};

  // customizations can't be removed, so we only check in one direction.
  for (const [code, customizations] of Object.entries(
    next.customizations ?? {},
  )) {
    for (const [idx, customization] of Object.entries(customizations)) {
      const prevXp = next.exileSlots[code]
        ? 0
        : prev.customizations?.[code]?.[idx]?.xp_spent;

      if (customization.xp_spent !== prevXp) {
        customizableDifferences[code] ??= [];
        customizableDifferences[code].push(customization);
      }
    }
  }

  return customizableDifferences;
}

type SlotDiff = [Card, number];

type Diff = {
  adds: SlotDiff[];
  removes: SlotDiff[];
};

function calculateXpSpent(
  prev: ResolvedDeck,
  next: ResolvedDeck,
  changes: Changes,
) {
  let xp = 0;

  const investigatorCode = next.investigatorBack.card.code;

  const investigatorCanIgnore =
    investigatorCode === SPECIAL_CARD_CODES.PARALLEL_AGNES ||
    investigatorCode === SPECIAL_CARD_CODES.PARALLEL_SKIDS;

  const { modifiers, modifierFlags } = getModifiers(prev, next);

  function applyDownTheRabbitHole(_cost: number, quantity: number) {
    let cost = _cost;

    for (const _ of range(0, Math.min(modifiers.downTheRabbitHole, quantity))) {
      if (cost > 0) {
        cost -= 1;
        modifiers.downTheRabbitHole -= 1;
      }
    }

    return cost;
  }

  function applyArcaneResearch(card: Card, _cost: number, quantity: number) {
    let cost = _cost;

    if (card.real_traits?.includes("Spell.")) {
      for (const _ of range(0, Math.min(modifiers.arcaneResearch, quantity))) {
        if (cost > 0) {
          cost -= 1;
          modifiers.arcaneResearch -= 1;
        }
      }
    }

    return cost;
  }

  function applyDejaVu(card: Card, _cost: number, quantity: number) {
    let cost = _cost;

    const repurchasable = Math.min(
      modifiers.dejaVu,
      quantity,
      next.exileSlots[card.code],
    );

    for (const _ of range(0, repurchasable)) {
      if (cost > 0) {
        cost -= 1;
        modifiers.dejaVu -= 1;
      }
    }

    return cost;
  }

  function handleDiff(changes: Changes, slotKey: "slots" | "extraSlots") {
    const diff = getSlotDiff(prev, next, changes[slotKey], slotKey);
    let free0Cards = countFreeLevel0Cards(prev, next, modifiers, diff, slotKey);

    function applyFree0Swaps(card: Card, _cost: number, quantity: number) {
      let cost = _cost;
      let swapped = 0;

      // in some cases, swapping in level 0 cards is free:
      // 1. deck below legal size.
      // 2. adaptable swaps.
      for (const _ of range(0, Math.min(free0Cards, quantity))) {
        if (cost > 0) {
          cost -= 1;
          free0Cards -= 1;
          swapped += 1;
        }
      }

      // if not all added level 0 cards can be swapped freely,
      // they will cost 1.
      // if DtRH is in deck, an additional penalty of 1XP is applied.
      if (swapped !== quantity) {
        if (modifierFlags.downTheRabbitHole) {
          cost += card.myriad ? 1 : quantity - swapped;
        }
      }

      return cost;
    }

    const upgrades = getDirectUpgrades(diff);

    for (const [card, quantity] of diff.adds) {
      let cost = countExperience(card, quantity);

      const level = realCardLevel(card);

      // story cards are free.
      if (level == null) {
        continue;
      }

      // level 0 cards cost a minimum of to purchase.
      // copy 2 to n of a myriad is free.
      if (level === 0) {
        cost += card.myriad ? 1 : quantity;
      }

      // exiled cards can be repurchased and potentially discounted via deja vu.
      if (next.exileSlots[card.code] && level > 0) {
        cost = applyDejaVu(card, cost, quantity);
      }

      // ignored cards (||Agnes, ||Skids) require full XP cost to purchase.
      // TODO: handle TCU <> Ace of Rods
      if (
        investigatorCanIgnore &&
        Object.values(next.cards.ignoreDeckLimitSlots).some(
          (x) => x.card.real_name === card.real_name,
        )
      ) {
        xp += cost;
        continue;
      }

      const upgradedFrom = upgrades[card.code];

      // if an XP card is upgraded, i.e. (1) => (5), subtract the previous upgrade's XP cost.
      if (upgradedFrom) {
        xp -= countExperience(upgradedFrom[0], Math.abs(upgradedFrom[1]));
        // upgrades can be discounted via DtRH and Arcane Research (spells).
        cost = applyDownTheRabbitHole(cost, quantity);
        cost = applyArcaneResearch(card, cost, quantity);
      } else if (level === 0) {
        cost = applyFree0Swaps(card, cost, quantity);
        // if an XP card is new and DtRH is in deck, a penalty of 1XP is applied.
      } else if (modifierFlags.downTheRabbitHole && !upgradedFrom) {
        cost += card.myriad ? 1 : quantity;
      }

      xp += cost;
    }

    modifiers.adaptable = Math.min(modifiers.adaptable, free0Cards);
  }

  handleDiff(changes, "slots");
  handleDiff(changes, "extraSlots");

  // Checking boxes on a customizable cards counts as upgrades.
  // We only take this code path for customizable already in deck to allow the add logic
  // to handle new customizable purchases.
  for (const [code, entries] of Object.entries(changes.customizations)) {
    if (prev.slots[code] && !next.exileSlots[code]) {
      const card = prev.cards.slots[code].card;
      let cost = entries.reduce((acc, curr) => acc + curr.xp_spent, 0);

      cost = applyDownTheRabbitHole(cost, cost);
      cost = applyArcaneResearch(card, cost, cost);

      xp += cost;
    }
  }

  return xp;
}

function getModifiers(prev: ResolvedDeck, next: ResolvedDeck) {
  const modifiers = {
    adaptable: (next.slots[SPECIAL_CARD_CODES.ADAPTABLE] ?? 0) * 2,
    arcaneResearch: prev.slots[SPECIAL_CARD_CODES.ARCANE_RESEARCH] ?? 0,
    dejaVu: (next.slots[SPECIAL_CARD_CODES.DEJA_VU] ?? 0) * 3,
    downTheRabbitHole:
      (prev.slots[SPECIAL_CARD_CODES.DOWN_THE_RABBIT_HOLE] ?? 0) * 2,
  };

  const modifierFlags = Object.fromEntries(
    Object.entries(modifiers).map(([key, val]) => [key, !!val]),
  );

  return { modifiers, modifierFlags };
}

function getSlotDiff(
  prev: ResolvedDeck,
  next: ResolvedDeck,
  slots: Record<string, number>,
  slotKey: "slots" | "extraSlots" = "slots",
) {
  return Object.entries(slots).reduce<Diff>(
    (acc, [code, quantity]) => {
      const isAdd = quantity > 0;

      const target = isAdd ? next : prev;

      const entry: SlotDiff = [target.cards[slotKey][code].card, quantity];

      if (isAdd) {
        acc.adds.push(entry);
      } else {
        acc.removes.push(entry);
      }

      return acc;
    },
    { adds: [], removes: [] },
  );
}

function countFreeLevel0Cards(
  prev: ResolvedDeck,
  next: ResolvedDeck,
  modifiers: Record<string, number>,
  slotDiff: Diff,
  slotKey: "slots" | "extraSlots",
) {
  let free0Cards = modifiers.adaptable;

  if (slotKey === "slots") {
    // when deck size increases, you may purchase x cards to replace existing cards.
    for (const [code, adjustment] of Object.entries(DECK_SIZE_ADJUSTMENTS)) {
      if (!prev.slots[code] && next.slots[code]) {
        free0Cards += Math.max(adjustment * next.slots[code], 0);
      }
    }
  }

  for (const [code, quantity] of Object.entries(next.exileSlots)) {
    // XXX: holds until extra deck and main deck can contain the same exilable card.
    if (prev[slotKey]?.[code]) {
      free0Cards += quantity;
    }
  }

  for (const [card, quantity] of slotDiff.adds) {
    if (!card.permanent) {
      continue;
    }

    const removed = slotDiff.removes.find((diff) => findUpgraded(diff, card));
    // upgrading a card into a permanent of same name frees a level 0 slot.
    if (removed && !removed[0].permanent) {
      free0Cards += quantity;
    }
  }

  return free0Cards;
}

function getDirectUpgrades(slotDiff: Diff) {
  const upgrades: Record<string, SlotDiff | undefined> = {};
  for (const [card] of slotDiff.adds) {
    const removed = slotDiff.removes.find((diff) => findUpgraded(diff, card));
    if (removed) upgrades[card.code] = removed;
  }

  return upgrades;
}

function findUpgraded(diff: SlotDiff, card: Card) {
  const x = diff[0];
  return x.real_name === card.real_name && (x.xp ?? 0) < (card.xp ?? 0);
}
