import type { Card } from "@arkham-build/shared";
import {
  countExperience,
  realCardLevel,
  splitMultiValue,
} from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { isEmpty } from "@/utils/is-empty";
import { range } from "@/utils/range";
import type { Customization, ResolvedDeck } from "./types";

type DeckChanges = {
  slots: Record<string, number>;
  extraSlots: Record<string, number>;
  customizations: Record<string, Customization[]>;
};

export type Modifier =
  | "adaptable"
  | "arcaneResearch"
  | "dejaVu"
  | "downTheRabbitHole";

type Modifiers = Record<Modifier, number>;
type ModifierFlags = Record<Modifier, boolean>;
type ModifierStats = Record<Modifier, { used: number; available: number }>;

export type ChangeStats = {
  changes: DeckChanges;
  xpAvailable?: number;
  xpAdjustment?: number;
  xpSpent?: number;
  xp?: number;
  modifierStats?: Partial<ModifierStats>;
};

export type UpgradeStats = {
  changes: DeckChanges;
  xpAvailable: number;
  xpAdjustment: number;
  xpSpent: number;
  xp: number;
  modifierStats: Partial<ModifierStats>;
};

function calculateOptimalXpSpent(
  prev: ResolvedDeck,
  next: ResolvedDeck,
  changes: DeckChanges,
): { xp: number; modifierStats: Partial<ModifierStats> } {
  const defaultResult = calculateXpSpent(prev, next, changes);

  if (
    !prev.slots[SPECIAL_CARD_CODES.ARCANE_RESEARCH] ||
    !prev.slots[SPECIAL_CARD_CODES.DOWN_THE_RABBIT_HOLE]
  ) {
    return defaultResult;
  }

  const altResult = calculateXpSpent(
    prev,
    next,
    changes,
    /* dtrhFirst */ false,
  );

  return altResult.xp < defaultResult.xp ? altResult : defaultResult;
}

export function getChangeStats(
  prev: ResolvedDeck,
  next: ResolvedDeck,
  omitUpgradeStats = false,
): ChangeStats {
  const changes = deckChanges(prev, next);
  if (omitUpgradeStats) return { changes };

  const xp = next.xp ?? 0;
  const xpAdjustment = next.xp_adjustment ?? 0;

  const { xp: xpSpent, modifierStats } = calculateOptimalXpSpent(
    prev,
    next,
    changes,
  );
  const xpAvailable = xp + xpAdjustment - xpSpent;

  return {
    changes,
    modifierStats,
    xpAvailable,
    xpAdjustment,
    xpSpent,
    xp,
  };
}

function deckChanges(prev: ResolvedDeck, next: ResolvedDeck): DeckChanges {
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
    // SAFEGUARD: If the card is not in either deck, skip it.
    if (!prev.cards[slotKey][code] && !next.cards[slotKey][code]) {
      continue;
    }

    const nextQuantity = next?.[slotKey]?.[code] ?? 0;
    const prevQuantity = prev?.[slotKey]?.[code] ?? 0;

    // There is some bad data in some arkhamdb decks where rbw has a negative quantity.
    if (prevQuantity < 0 || nextQuantity < 0) {
      continue;
    }

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

      // if a customization was removed (which is illegal), ignore it.
      if (prevXp && prevXp > customization.xp_spent) {
        continue;
      }

      if (customization.xp_spent !== prevXp) {
        customizableDifferences[code] ??= [];
        customizableDifferences[code].push({
          ...customization,
          xp_spent: customization.xp_spent - (prevXp ?? 0),
        });
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
  changes: DeckChanges,
  dtrhFirst = true,
) {
  let xp = 0;

  const { modifiers, modifiersAvailable, modifierFlags } = getModifiers(
    prev,
    next,
  );

  const originalModifiers = structuredClone(modifiers);

  function applyDownTheRabbitHole(_cost: number) {
    // regardless of how many discounts actually apply, DtRH can only apply to two cards.
    if ((modifiersAvailable.downTheRabbitHole ?? 0) <= 0) return _cost;

    let cost = _cost;

    if (cost > 0) {
      cost -= 1;
      modifiers.downTheRabbitHole -= 1;
    }

    if (modifiersAvailable.downTheRabbitHole) {
      modifiersAvailable.downTheRabbitHole -= 1;
    }

    return cost;
  }

  function applyArcaneResearch(_cost: number) {
    // regardless of how many discounts actually apply, AR can only apply to one card.
    if ((modifiersAvailable.arcaneResearch ?? 0) <= 0) return _cost;

    let cost = _cost;

    for (const _ of range(0, modifiers.arcaneResearch)) {
      if (cost > 0) {
        cost -= 1;
        modifiers.arcaneResearch -= 1;
      }
    }

    modifiersAvailable.arcaneResearch = 0;
    return cost;
  }

  function applyDejaVu(card: Card, _cost: number, quantity: number) {
    let cost = _cost;

    const repurchasable = Math.min(quantity, next.exileSlots[card.code]);
    const dejaVuQuantity = next.slots[SPECIAL_CARD_CODES.DEJA_VU];

    for (const _ of range(0, repurchasable)) {
      const mod = modifiers.dejaVu;

      if (mod > 0 && cost > 0) {
        const discount = Math.min(dejaVuQuantity, cost);
        cost -= discount;
        modifiers.dejaVu -= discount;
      }
    }

    return cost;
  }

  function handleDiff(changes: DeckChanges, slotKey: "slots" | "extraSlots") {
    const diff = getSlotDiff(prev, next, changes[slotKey], slotKey);
    let free0Cards = countFreeLevel0Cards(prev, next, modifiers, diff, slotKey);

    function applyFree0Swaps(_cost: number, quantity: number) {
      let cost = _cost;

      // in some cases, swapping in level 0 cards is free:
      // 1. deck below legal size.
      // 2. adaptable swaps.
      for (const _ of range(0, Math.min(free0Cards, quantity))) {
        if (cost > 0) {
          cost -= 1;
          free0Cards -= 1;
        }
      }

      return cost;
    }

    const swaps = getSwaps(diff);
    const upgrades = getDirectUpgrades(diff);

    // Myriad cards are counted only once, regardless of sub name.
    const myriadCounted: Record<string, boolean> = {};

    for (const [card, _quantity] of diff.adds) {
      // Checking boxes on a customizable cards counts as upgrades.
      // We only handle customizable purchases as adds if the cards are new.
      if (
        prev.slots[card.code] &&
        !next.exileSlots[card.code] &&
        changes.customizations[card.code]?.some((c) => c.xp_spent)
      ) {
        continue;
      }

      let quantity = _quantity;

      const swappedWith = swaps[card.code];
      // swapping a card for a version of itself is free
      if (swappedWith) {
        quantity -= swappedWith[1];
        if (quantity <= 0) continue;
      }

      // some player cards can be given as story assets, these copies are free.
      if (
        card.code === SPECIAL_CARD_CODES.ACE_OF_RODS &&
        next.ignoreDeckLimitSlots?.[card.code]
      ) {
        quantity -= next.ignoreDeckLimitSlots?.[card.code];

        if (quantity <= 0) {
          continue;
        }
      }

      const level = realCardLevel(card);

      // story cards are free.
      if (level == null) {
        continue;
      }

      // additional copies of a myriad card are free.
      if (card.myriad && myriadCounted[card.real_name]) {
        continue;
      }

      let cost = countExperience(card, quantity);
      if (card.myriad) myriadCounted[card.real_name] = true;

      // level 0 cards cost a minimum of 1 to purchase.
      // copy 2 to n of a myriad is free.
      if (level === 0) {
        cost += card.myriad ? 1 : quantity;
      }

      // exiled cards can be repurchased and potentially discounted via deja vu.
      if (next.exileSlots[card.code] && level > 0) {
        cost = applyDejaVu(card, cost, quantity);
      }

      // ignored cards (||Agnes, ||Skids) require full XP cost to purchase, as well as any DtRH penalties.
      if (
        Object.values(next.cards.ignoreDeckLimitSlots).some(
          (x) => x.card.real_name === card.real_name,
        )
      ) {
        xp += cost;
        if (modifierFlags.downTheRabbitHole) {
          xp += quantity;
        }
        continue;
      }

      const isSpell = splitMultiValue(card.real_traits).includes("Spell");

      const isUpgraded = !isEmpty(upgrades[card.code]);

      // if an XP card is upgraded, i.e. (1) => (5), subtract the previous upgrade's XP cost.
      if (isUpgraded) {
        for (const upgradedFrom of upgrades[card.code] ?? []) {
          const upgradedCount = upgradedFrom[1];

          // handle these one by one to account for discounts properly.
          for (const _ of range(0, upgradedCount)) {
            cost -= countExperience(upgradedFrom[0], 1);

            const spent =
              countExperience(card, 1) - countExperience(upgradedFrom[0], 1);

            // upgrades can be discounted via DtRH and Arcane Research (spells).
            let discounted = spent;

            if (dtrhFirst) {
              discounted = applyDownTheRabbitHole(discounted);
              if (isSpell) discounted = applyArcaneResearch(discounted);
            } else {
              if (isSpell) discounted = applyArcaneResearch(discounted);
              discounted = applyDownTheRabbitHole(discounted);
            }

            cost -= spent - discounted;
          }
        }
      } else if (level === 0) {
        cost = applyFree0Swaps(cost, quantity);
        // if an XP card is new and DtRH is in deck, a penalty of 1XP is applied,
        // (unless it's an exiled card that is re-added)
        // FIXME: there is an edge case here where only one copy is an upgrade, while the other is a buy.
        //        in this case, DtRH should apply once, but currently it does not.
      } else if (modifierFlags.downTheRabbitHole && !isUpgraded) {
        const exiled = next.exileSlots[card.code] ?? 0;
        const added = quantity - exiled;

        if (added > 0) {
          cost += card.myriad ? 1 : added;
        }
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
      const isSpell = splitMultiValue(card.real_traits).includes("Spell");

      let cost = entries.reduce((acc, curr) => acc + curr.xp_spent, 0);

      if (dtrhFirst) {
        cost = applyDownTheRabbitHole(cost);
        if (isSpell) cost = applyArcaneResearch(cost);
      } else {
        if (isSpell) cost = applyArcaneResearch(cost);
        cost = applyDownTheRabbitHole(cost);
      }

      xp += cost;
    }
  }

  const modifierStats = Object.entries(originalModifiers).reduce<
    Partial<ModifierStats>
  >((acc, [key, val]) => {
    if (val) {
      const available = val;
      const used = val - modifiers[key as Modifier];
      acc[key as Modifier] = {
        available,
        used,
      };
    }
    return acc;
  }, {});

  return { modifierStats, xp };
}

function getModifiers(
  prev: ResolvedDeck,
  next: ResolvedDeck,
): {
  modifierFlags: ModifierFlags;
  modifiers: Modifiers;
  modifiersAvailable: Partial<Modifiers>;
} {
  const modifiers = {
    adaptable: (next.slots[SPECIAL_CARD_CODES.ADAPTABLE] ?? 0) * 2,
    arcaneResearch: prev.slots[SPECIAL_CARD_CODES.ARCANE_RESEARCH] ?? 0,
    dejaVu: (next.slots[SPECIAL_CARD_CODES.DEJA_VU] ?? 0) * 3,
    downTheRabbitHole:
      (prev.slots[SPECIAL_CARD_CODES.DOWN_THE_RABBIT_HOLE] ?? 0) * 2,
  };

  const modifierFlags = Object.fromEntries(
    Object.entries(modifiers).map(([key, val]) => [key, !!val]),
  ) as ModifierFlags;

  const modifiersAvailable = {
    arcaneResearch: modifiers.arcaneResearch,
    downTheRabbitHole: modifiers.downTheRabbitHole,
  };

  return { modifiers, modifierFlags, modifiersAvailable };
}

function getSlotDiff(
  prev: ResolvedDeck,
  next: ResolvedDeck,
  slots: Record<string, number>,
  slotKey: "slots" | "extraSlots" = "slots",
) {
  const diffs = Object.entries(slots).reduce<Diff>(
    (acc, [code, quantity]) => {
      const isAdd = quantity > 0;

      const target = isAdd ? next : prev;

      const targetCard = target.cards[slotKey][code]?.card;

      if (!targetCard) {
        // This can happen when a fan-made card was added to the deck, the deck not saved, and the pack then uninstalled.
        return acc;
      }

      const entry: SlotDiff = [targetCard, quantity];

      if (isAdd) {
        acc.adds.push(entry);
      } else {
        acc.removes.push(entry);
      }

      return acc;
    },
    { adds: [], removes: [] },
  );

  // Sort additions first by whether they are spells, then by XP cost diff.
  // This makes it so the combination of DtRH and Arcane Research is calculated optimally.
  diffs.adds.sort((a, b) => {
    const aCard = a[0];
    const bCard = b[0];

    const aLevel = realCardLevel(aCard) ?? -1;
    const bLevel = realCardLevel(bCard) ?? -1;

    const aUpgradedFrom = diffs.removes.find((diff) =>
      findUpgraded(diff, aCard),
    );

    const bUpgradedFrom = diffs.removes.find((diff) =>
      findUpgraded(diff, bCard),
    );

    if (!aUpgradedFrom || !bUpgradedFrom) {
      return bLevel - aLevel;
    }

    const aSpell = aCard.real_traits?.includes("Spell.") ? 1 : 0;
    const bSpell = bCard.real_traits?.includes("Spell.") ? 1 : 0;
    if (aSpell !== bSpell) return aSpell - bSpell;

    const aCardBaseLevel = realCardLevel(aUpgradedFrom[0]) ?? 0;
    const bCardBaseLevel = realCardLevel(bUpgradedFrom[0]) ?? 0;

    const aDiff = aLevel - aCardBaseLevel;
    const bDiff = bLevel - bCardBaseLevel;
    return bDiff - aDiff;
  });

  return diffs;
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
    const adjustment = Object.entries(next[slotKey]).reduce<number>(
      (acc, [code, quantity]) => {
        const diff = quantity - (prev[slotKey][code] ?? 0);

        if (diff > 0) {
          const deckSizeAdjust =
            next.cards[slotKey][code]?.card?.deck_requirements?.size;

          if (deckSizeAdjust != null) {
            return acc + deckSizeAdjust * diff;
          }
        }

        return acc;
      },
      0,
    );

    free0Cards += Math.max(adjustment, 0);
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
  const upgrades: Record<string, SlotDiff[] | undefined> = {};

  // expand removes into single quantities to handle case
  // where one card is upgraded into from multiple different cards.
  const removes = slotDiff.removes.flatMap((diff) => {
    const qty = Math.abs(diff[1]);
    return range(0, qty).map(() => [diff[0], -1] as SlotDiff);
  });

  for (const [card, quantityAdded] of slotDiff.adds) {
    let unmatched = quantityAdded;

    while (unmatched > 0) {
      const removedIdx = removes.findIndex((diff) => findUpgraded(diff, card));

      if (removedIdx < 0) break;

      const removed = removes.splice(removedIdx, 1)[0];

      const quantityRemoved = Math.abs(removed[1]);

      upgrades[card.code] ??= [];
      upgrades[card.code]?.push([
        removed[0],
        Math.min(quantityRemoved, quantityAdded),
      ]);

      unmatched -= quantityRemoved;
    }
  }

  return upgrades;
}

function findUpgraded(diff: SlotDiff, card: Card) {
  const x = diff[0];
  return x.real_name === card.real_name && (x.xp ?? 0) < (card.xp ?? 0);
}

function getSwaps(slotDiff: Diff) {
  const swaps: Record<string, SlotDiff | undefined> = {};

  for (const [card, quantityAdded] of slotDiff.adds) {
    const swapped = slotDiff.removes.find((diff) => {
      const x = diff[0];
      return (
        x.real_name === card.real_name &&
        x.xp === card.xp &&
        x.subname === card.subname
      );
    });

    if (swapped) {
      const quantityRemoved = Math.abs(swapped[1]);
      swaps[card.code] = [swapped[0], Math.min(quantityRemoved, quantityAdded)];
    }
  }

  return swaps;
}
