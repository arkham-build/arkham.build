import type { Deck, Slots } from "@/store/slices/data.types";
import {
  countExperience,
  decodeExileSlots,
  isSpecialCard,
} from "@/utils/card-utils";
import { range } from "@/utils/range";
import type { Card } from "../services/queries.types";
import type { StoreState } from "../slices";
import { addCardToDeckCharts, emptyDeckCharts } from "./deck-charts";
import type { LookupTables } from "./lookup-tables.types";
import { resolveCardWithRelations } from "./resolve-card";
import type {
  CardWithRelations,
  Customizations,
  DeckCharts,
  DeckMeta,
  ResolvedCard,
  ResolvedDeck,
} from "./types";

export function decodeSlots(
  deps: Pick<StoreState, "metadata"> & {
    lookupTables: LookupTables;
  },
  collator: Intl.Collator,
  deck: Deck,
  extraSlots: ResolvedDeck["extraSlots"],
  investigator: CardWithRelations,
  customizations: Customizations | undefined,
) {
  const cards: ResolvedDeck["cards"] = {
    bondedSlots: {},
    exileSlots: {},
    extraSlots: {},
    ignoreDeckLimitSlots: {},
    investigator: investigator,
    sideSlots: {},
    slots: {},
  };

  let fanMadeData: ResolvedDeck["fanMadeData"];

  function addToFanMadeData({ card, cycle, pack, encounterSet }: ResolvedCard) {
    if (!card.official) {
      fanMadeData ??= {
        cards: {},
        cycles: {},
        encounter_sets: {},
        packs: {},
      };

      if (!fanMadeData.cycles[cycle.code]) {
        fanMadeData.cycles[cycle.code] = cycle;
      }

      if (!fanMadeData.packs[pack.code]) {
        fanMadeData.packs[pack.code] = pack;
      }

      if (encounterSet && !fanMadeData.encounter_sets[encounterSet.code]) {
        fanMadeData.encounter_sets[encounterSet.code] = encounterSet;
      }

      if (!fanMadeData.cards[card.code]) {
        fanMadeData.cards[card.code] = card;
      }
    }
  }

  let deckSize = 0;
  let deckSizeTotal = 0;
  let xpRequired = 0;

  const charts: DeckCharts = emptyDeckCharts();

  const bonded: Card[] = [];

  // Add fan-made investigators to data.
  addToFanMadeData(investigator);

  // Add cards bonded to investigator to deck.
  const investigatorRelations = investigator?.relations;
  if (investigatorRelations?.bound?.length) {
    for (const related of investigatorRelations.bound) {
      bonded.push(related.card);
      addToFanMadeData(related);
    }
  }

  // Myriad cards are counted only once, regardless of sub name.
  const myriadCounted: Record<string, boolean> = {};

  for (const [code, quantity] of Object.entries(deck.slots)) {
    const card = resolveCardWithRelations(
      deps,
      collator,
      code,
      deck.taboo_id,
      customizations,
      true,
    );

    if (card) {
      deckSizeTotal += quantity;
      cards.slots[code] = card;

      xpRequired +=
        card.card.myriad && myriadCounted[card.card.real_name]
          ? 0
          : countExperience(card.card, quantity);

      if (card.card.myriad && !myriadCounted[card.card.real_name]) {
        myriadCounted[card.card.real_name] = true;
      }

      if (deck.ignoreDeckLimitSlots?.[code]) {
        cards.ignoreDeckLimitSlots[code] = card;
      }

      if (!isSpecialCard(card.card)) {
        deckSize += Math.max(
          quantity - (deck.ignoreDeckLimitSlots?.[code] ?? 0),
          0,
        );
      }

      addToFanMadeData(card);
      addCardToDeckCharts(card.card, quantity, charts);

      // Collect bonded cards, filtering out duplicates.
      // These can occur when e.g. two versions of `Dream Diary` are in a deck.
      const bound = Object.keys(
        deps.lookupTables.relations.bound[code] ?? {},
      ).map((code) => deps.metadata.cards[code]);

      if (bound?.length) {
        for (const boundCard of bound) {
          if (
            !boundCard.code.endsWith("b") &&
            !bonded.some((c) => c.code === boundCard.code) &&
            deck.slots[code] > 0
          ) {
            bonded.push(boundCard);
          }
        }
      }
    }
  }

  if (deck.sideSlots && !Array.isArray(deck.sideSlots)) {
    for (const [code] of Object.entries(deck.sideSlots)) {
      const card = resolveCardWithRelations(
        deps,
        collator,
        code,
        deck.taboo_id,
        customizations,
        false,
      ); // SAFE! we do not need relations for side deck.

      if (card) {
        addToFanMadeData(card);
        cards.sideSlots[code] = card;
      }
    }
  }

  const exileSlots = decodeExileSlots(deck.exile_string);

  for (const [code] of Object.entries(exileSlots)) {
    const card = resolveCardWithRelations(
      deps,
      collator,
      code,
      deck.taboo_id,
      customizations,
      false,
    ); // SAFE! we do not need relations for exile deck.

    if (card) {
      addToFanMadeData(card);
      cards.exileSlots[code] = card;
    }
  }

  if (extraSlots && !Array.isArray(extraSlots)) {
    for (const [code, quantity] of Object.entries(extraSlots)) {
      const card = resolveCardWithRelations(
        deps,
        collator,
        code,
        deck.taboo_id,
        customizations,
        false,
      ); // SAFE! we do not need relations for extra deck.

      if (card) {
        xpRequired += countExperience(card.card, quantity);
        deckSizeTotal += quantity;
        cards.extraSlots[code] = card;
        addToFanMadeData(card);
      }
    }
  }

  const bondedSlots: Slots = {};

  for (const card of bonded) {
    const resolved = resolveCardWithRelations(
      deps,
      collator,
      card.code,
      deck.taboo_id,
      customizations,
      false,
    );
    if (resolved) {
      addToFanMadeData(resolved);
      cards.bondedSlots[card.code] = resolved;
      bondedSlots[card.code] = card.quantity;
    }
  }

  return {
    bondedSlots,
    cards,
    fanMadeData,
    deckSize,
    deckSizeTotal,
    xpRequired,
    charts,
  };
}

/**
 * Decodes extra slots from a parsed deck meta JSON.
 */
export function decodeExtraSlots(deckMeta: DeckMeta): Slots {
  if (deckMeta.extra_deck) {
    const extraSlots: Record<string, number> = {};

    for (const code of deckMeta.extra_deck.split(",")) {
      extraSlots[code] = (extraSlots[code] ?? 0) + 1;
    }

    return extraSlots;
  }

  return {};
}

/**
 * Encodes extra slots into a deck meta field.
 */
export function encodeExtraSlots(slots: Record<string, number>) {
  const entries = Object.entries(slots).reduce<string[]>(
    (acc, [code, quantity]) => {
      if (quantity > 0) {
        for (const _ of range(0, quantity)) {
          acc.push(code);
        }
      }

      return acc;
    },
    [],
  );

  return entries.length ? entries.join(",") : undefined;
}
