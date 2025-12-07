import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { formatDeckImport, formatDeckShare } from "../lib/deck-io";
import { dehydrate } from "../persist";
import { type Deck, isDeck } from "../schemas/deck.schema";
import { selectDeckHistory } from "../selectors/decks";
import {
  selectClientId,
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "../selectors/shared";
import { createShare, deleteShare, updateShare } from "../services/queries";
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

  async createShare(id) {
    const state = get();

    assert(!state.sharing.decks[id], `Deck with id ${id} is already shared.`);

    const deck = state.data.decks[id];
    assert(deck, `Deck with id ${id} not found.`);

    const previousDeckId = deck.previous_deck;
    const previousDeckShared =
      previousDeckId && !!state.sharing.decks[previousDeckId];

    await createShare(
      selectClientId(state),
      formatDeckShare(deck, previousDeckShared ? previousDeckId : null),
      selectDeckHistory(
        {
          ...state,
          metadata: selectMetadata(state),
        },
        selectLookupTables(state),
        selectLocaleSortingCollator(state),
        deck,
      ),
    );

    set((prev) => ({
      sharing: {
        decks: {
          ...prev.sharing.decks,
          [id]: deck.date_update,
        },
      },
    }));

    await dehydrate(get(), "app");
  },

  async updateShare(deck) {
    const state = get();

    if (!state.sharing.decks[deck.id]) return;

    await updateShare(
      selectClientId(state),
      deck.id.toString(),
      formatDeckShare(deck),
      selectDeckHistory(
        {
          ...state,
          metadata: selectMetadata(state),
        },
        selectLookupTables(state),
        selectLocaleSortingCollator(state),
        deck,
      ),
    );

    set((prev) => ({
      sharing: {
        ...prev.sharing,
        decks: {
          ...prev.sharing.decks,
          [deck.id]: deck.date_update,
        },
      },
    }));

    await dehydrate(get(), "app");

    return deck.id;
  },

  async deleteShare(id) {
    const state = get();

    if (!state.sharing.decks[id]) return;

    await deleteShare(selectClientId(state), id);

    set((prev) => {
      const decks = { ...prev.sharing.decks };
      delete decks[id];
      return {
        sharing: {
          decks,
        },
      };
    });

    await dehydrate(get(), "app");
  },

  async deleteAllShares() {
    const state = get();

    // TODO: surface this error.
    await Promise.all(
      Object.keys(state.sharing.decks).map((id) =>
        deleteShare(selectClientId(state), id),
      ),
    ).catch(console.error);

    set({
      sharing: {
        decks: {},
      },
    });

    await dehydrate(get(), "app");
  },
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
