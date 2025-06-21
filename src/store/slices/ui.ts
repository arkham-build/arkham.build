import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import { buildCacheFromDecks } from "../lib/fan-made-content";
import type { UISlice, UIState } from "./ui.types";

function getInitialUIState(): UIState {
  return {
    ui: {
      initialized: false,
      showUnusableCards: false,
      showLimitedAccess: true,
      fanMadeContentCache: {},
    },
  };
}

export const createUISlice: StateCreator<StoreState, [], [], UISlice> = (
  set,
  get,
) => ({
  ...getInitialUIState(),
  setShowUnusableCards(showUnusableCards: boolean) {
    set({ ui: { ...get().ui, showUnusableCards } });
  },
  setShowLimitedAccess(showLimitedAccess: boolean) {
    set({ ui: { ...get().ui, showLimitedAccess } });
  },
  cacheFanMadeContent(decks) {
    set((state) => {
      const cache = state.ui.fanMadeContentCache;
      const deckContent = buildCacheFromDecks(decks);
      return {
        ui: {
          ...state.ui,
          fanMadeContentCache: {
            cards: {
              ...cache?.cards,
              ...deckContent.cards,
            },
            cycles: {
              ...cache?.cycles,
              ...deckContent.cycles,
            },
            packs: {
              ...cache?.packs,
              ...deckContent.packs,
            },
            encounter_sets: {
              ...cache?.encounter_sets,
              ...deckContent.encounter_sets,
            },
          },
        },
      };
    });
  },
});
