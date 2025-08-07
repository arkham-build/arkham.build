import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { deckDateTickRange, deckTickToString } from "../lib/arkhamdb-decklists";
import type { StoreState } from ".";
import type { RecommenderSlice, RecommenderState } from "./recommender.types";

function getInitialRecommenderState(): RecommenderState {
  return {
    recommender: {
      includeSideDeck: true,
      isRelative: false,
      deckFilter: deckDateTickRange().map(deckTickToString) as [string, string],
      coreCards: {},
    },
  };
}

export const createRecommenderSlice: StateCreator<
  StoreState,
  [],
  [],
  RecommenderSlice
> = (set) => ({
  ...getInitialRecommenderState(),
  setIncludeSideDeck(value) {
    set((state) => ({
      recommender: {
        ...state.recommender,
        includeSideDeck: value,
      },
    }));
  },
  setIsRelative(value) {
    set((state) => ({
      recommender: {
        ...state.recommender,
        isRelative: value,
      },
    }));
  },
  setRecommenderDeckFilter(value) {
    set((state) => ({
      recommender: {
        ...state.recommender,
        deckFilter: value,
      },
    }));
  },
  addCoreCard(deckId, value) {
    set((state) => {
      const current = state.recommender.coreCards[deckId] ?? [];
      assert(!current.includes(value), `${value} already is a core card.`);

      return {
        recommender: {
          ...state.recommender,
          coreCards: {
            ...state.recommender.coreCards,
            [deckId]: [...current, value],
          },
        },
      };
    });
  },
  removeCoreCard(deckId, value) {
    set((state) => {
      const current = state.recommender.coreCards[deckId] ?? [];
      assert(current.includes(value), `${value} is not a core card.`);

      return {
        recommender: {
          ...state.recommender,
          coreCards: {
            ...state.recommender.coreCards,
            [deckId]: current.filter((v) => v !== value),
          },
        },
      };
    });
  },
});
