import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import type {
  DeckCollectionSlice,
  DeckCollectionState,
} from "./deck-collection.types";

function getInitialUIState(): DeckCollectionState {
  return {
    expandedFolders: {},
    filters: {
      cards: [],
      faction: [],
      properties: {
        parallel: false,
      },
      provider: [],
      search: "",
      tags: [],
      validity: "all",
      xpCost: undefined,
    },
    open: {
      cards: false,
      properties: true,
      provider: true,
      tags: false,
      validity: false,
      xpCost: false,
    },
    sort: {
      criteria: "date_updated",
      order: "desc",
    },
  };
}

export const createDeckCollectionSlice: StateCreator<
  StoreState,
  [],
  [],
  DeckCollectionSlice
> = (set) => ({
  deckCollection: getInitialUIState(),
  addDecksFilter(type, value) {
    set((state) => {
      const filterValues = structuredClone(state.deckCollection.filters);
      filterValues[type] = value;

      return {
        deckCollection: {
          ...state.deckCollection,
          filters: filterValues,
        },
      };
    });
  },

  setDeckFilterOpen(filter, value) {
    set((state) => ({
      deckCollection: {
        ...state.deckCollection,
        open: { ...state.deckCollection.open, [filter]: value },
      },
    }));
  },

  setDeckSort(payload) {
    set((state) => ({
      deckCollection: {
        ...state.deckCollection,
        sort: {
          ...state.deckCollection.sort,
          ...payload,
        },
      },
    }));
  },

  resetDeckFilter(filter) {
    set((state) => {
      const initialState = getInitialUIState().filters[filter];
      return {
        deckCollection: {
          ...state.deckCollection,
          open: { ...state.deckCollection.open },
          filters: { ...state.deckCollection.filters, [filter]: initialState },
        },
      };
    });
  },

  toggleFolderExpanded(folderId) {
    set((state) => {
      const current = state.deckCollection.expandedFolders?.[folderId] ?? false;

      return {
        deckCollection: {
          ...state.deckCollection,
          expandedFolders: {
            ...state.deckCollection.expandedFolders,
            [folderId]: !current,
          },
        },
      };
    });
  },
});
