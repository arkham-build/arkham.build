import { type Deck, isDeck } from "@arkham-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { formatDeckImport } from "../lib/deck-io";
import { dehydrate } from "../persist";
import type { StoreState } from ".";
import type { SharingSlice } from "./sharing.types";

function getInitialSharingState() {
  return {
    decks: {},
  };
}

export const createSharingSlice: StateCreator<
  StoreState,
  [],
  [],
  SharingSlice
> = (set, get) => ({
  sharing: getInitialSharingState(),

  async importSharedDeck(importDeck, type) {
    const state = get();

    assert(
      !state.data.decks[importDeck.id],
      `Deck with id ${importDeck.id} already exists.`,
    );

    const deck = formatDeckImport(state, importDeck as Deck, type);
    assert(isDeck(deck), "Invalid deck data.");

    set((prev) => ({
      data: {
        ...prev.data,
        decks: {
          ...prev.data.decks,
          [deck.id]: deck,
        },
        history: {
          ...prev.data.history,
          [deck.id]: [],
        },
      },
    }));

    await dehydrate(get(), "app");

    return deck.id;
  },
});
