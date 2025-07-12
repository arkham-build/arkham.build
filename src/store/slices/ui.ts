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
