import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import type {
  DecklistsFiltersSlice,
  DecklistsFiltersState,
} from "./decklists-filters.types";

function getInitialDecklistsFiltersState(): DecklistsFiltersState {
  return {
    filters: {
      analyzeSideDecks: true,
      authorName: "",
      canonicalInvestigatorCode: undefined,
      dateRange: undefined,
      description_length: 0,
      excluded_cards: [],
      investigatorFactions: [],
      name: undefined,
      requiredCards: [],
    },
    sortBy: "popularity",
    offset: 0,
  };
}

export const createDecklistsSearchSlice: StateCreator<
  StoreState,
  [],
  [],
  DecklistsFiltersSlice
> = (set) => ({
  decklistsFilters: getInitialDecklistsFiltersState(),
  setDecklistsSortBy: (sortBy) => {
    set((state) => ({
      decklistsFilters: {
        ...state.decklistsFilters,
        sortBy,
      },
    }));
  },
  setDecklistsOffset: (offset) => {
    set((state) => ({
      decklistsFilters: { ...state.decklistsFilters, offset },
    }));
  },
  setDecklistsFilters: (filters) => {
    set((state) => ({
      decklistsFilters: {
        ...state.decklistsFilters,
        filters,
        offset: 0,
      },
    }));
  },
  resetDecklistsFilters() {
    set({
      decklistsFilters: getInitialDecklistsFiltersState(),
    });
  },
});
