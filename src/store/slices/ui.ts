import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import { decodeDeckMeta } from "../lib/deck-meta";
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
  cacheFanMadeContent(deck) {
    const meta = decodeDeckMeta(deck);
    if (!meta.fan_made_content) return;
    const state = get();
    set({
      ui: {
        ...state.ui,
        fanMadeContentCache: {
          cards: {
            ...state.ui.fanMadeContentCache?.cards,
            ...meta.fan_made_content.cards,
          },
          cycles: {
            ...state.ui.fanMadeContentCache?.cycles,
            ...meta.fan_made_content.cycles,
          },
          packs: {
            ...state.ui.fanMadeContentCache?.packs,
            ...meta.fan_made_content.packs,
          },
          encounter_sets: {
            ...state.ui.fanMadeContentCache?.encounter_sets,
            ...meta.fan_made_content.encounter_sets,
          },
        },
      },
    });
  },
});
