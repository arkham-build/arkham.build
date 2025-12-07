import type { StateCreator } from "zustand";
import { buildCacheFromDecks } from "../lib/fan-made-content";
import type { DeckFanMadeContent } from "../lib/types";
import type { StoreState } from ".";
import type { UISlice, UIState } from "./ui.types";

function getInitialUIState(): UIState {
  return {
    ui: {
      initialized: false,
      showUnusableCards: false,
      showLimitedAccess: true,
      fanMadeContentCache: {},
      navigationHistory: [],
      cardModal: {
        code: undefined,
        config: undefined,
      },
    },
  };
}

export const createUISlice: StateCreator<StoreState, [], [], UISlice> = (
  set,
) => ({
  ...getInitialUIState(),
  setShowUnusableCards(showUnusableCards: boolean) {
    set((state) => ({ ui: { ...state.ui, showUnusableCards } }));
  },
  setShowLimitedAccess(showLimitedAccess: boolean) {
    set((state) => ({ ui: { ...state.ui, showLimitedAccess } }));
  },
  cacheFanMadeContent(decks) {
    // FIXME: dont update if the cache is already up to date
    set((state) => ({
      ui: {
        ...state.ui,
        fanMadeContentCache: mergeFanMadeContent(
          state.ui.fanMadeContentCache,
          buildCacheFromDecks(decks),
        ),
      },
    }));
  },
  pushHistory(path: string) {
    set((state) => {
      if (state.ui.navigationHistory.at(-1) === path) {
        return state;
      }

      return {
        ui: {
          ...state.ui,
          navigationHistory: [...state.ui.navigationHistory, path].slice(-10),
        },
      };
    });
  },
  pruneHistory(index: number) {
    set((state) => ({
      ui: {
        ...state.ui,
        navigationHistory: state.ui.navigationHistory.slice(0, index),
      },
    }));
  },
  openCardModal(code) {
    set((state) => ({
      ui: {
        ...state.ui,
        cardModal: {
          ...state.ui.cardModal,
          code,
        },
      },
    }));
  },
  closeCardModal() {
    set((state) => ({
      ui: {
        ...state.ui,
        cardModal: {
          ...state.ui.cardModal,
          code: undefined,
        },
      },
    }));
  },
  setCardModalConfig(config) {
    set((state) => ({
      ui: {
        ...state.ui,
        cardModal: {
          ...state.ui.cardModal,
          config,
        },
      },
    }));
  },
});

function mergeFanMadeContent(
  a: Partial<DeckFanMadeContent> | undefined,
  b: Partial<DeckFanMadeContent> | undefined,
) {
  return {
    cards: {
      ...a?.cards,
      ...b?.cards,
    },
    cycles: {
      ...a?.cycles,
      ...b?.cycles,
    },
    packs: {
      ...a?.packs,
      ...b?.packs,
    },
    encounter_sets: {
      ...a?.encounter_sets,
      ...b?.encounter_sets,
    },
  };
}
