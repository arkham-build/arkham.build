import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { and } from "@/utils/fp";
import { createSelector } from "reselect";
import { ownedCardCount } from "../lib/card-ownership";
import {
  filterBacksides,
  filterDuplicates,
  filterEncounterCards,
} from "../lib/filtering";
import type { StoreState } from "../slices";
import { selectLookupTables, selectMetadata } from "./shared";

export type Counts = {
  player: number;
  encounter: number;
};

export type CollectionCounts = {
  cycles: Record<string, Counts>;
  packs: Record<string, Counts>;
};

export const selectTotalOwned = createSelector(
  selectMetadata,
  selectLookupTables,
  (state: StoreState) => state.settings.collection,
  (metadata, lookupTables, collection) => {
    const cards = Object.values(metadata.cards);

    let ownedPlayerCards = 0;
    let ownedEncounterCards = 0;

    const filter = and([(c) => !c.hidden, filterBacksides, filterDuplicates]);

    for (const card of cards) {
      if (!filter(card)) continue;

      const owned = ownedCardCount(
        card,
        metadata,
        lookupTables,
        collection,
        false,
      );

      if (filterEncounterCards(card)) {
        ownedEncounterCards += owned;
      } else {
        ownedPlayerCards += owned;
      }
    }

    return {
      player: ownedPlayerCards,
      encounter: ownedEncounterCards,
    } as Counts;
  },
);

export const selectCycleCardCounts = createSelector(
  selectMetadata,
  (metadata) => {
    const res: CollectionCounts = {
      cycles: {},
      packs: {},
    };

    const filter = and([
      filterBacksides,
      (c) => c.code !== SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS,
    ]);

    for (const card of Object.values(metadata.cards)) {
      if (!filter(card)) continue;

      const packCode = card.pack_code;
      const isEncounter = filterEncounterCards(card);

      const pack = metadata.packs[packCode];
      const cycle = metadata.cycles[pack.cycle_code];

      res.packs[packCode] ??= { player: 0, encounter: 0 };
      res.cycles[cycle.code] ??= { player: 0, encounter: 0 };

      if (isEncounter) {
        res.cycles[cycle.code].encounter += card.quantity || 1;
        res.packs[packCode].encounter += card.quantity || 1;
      } else {
        res.cycles[cycle.code].player += card.quantity || 1;
        res.packs[packCode].player += card.quantity || 1;
      }
    }

    if (res.packs["rcore"] && res.packs["core"]) {
      res.packs["rcore"].encounter = res.packs["core"].encounter;
    }

    return res;
  },
);
