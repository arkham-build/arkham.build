import { assert } from "@/utils/assert";
import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import { formatDeckImport, formatDeckShare } from "../lib/deck-io";
import { selectDeckHistory } from "../selectors/decks";
import {
  selectClientId,
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "../selectors/shared";
import { createShare, deleteShare, updateShare } from "../services/queries";
import { type Deck, isDeck } from "./data.types";
import type { SharingSlice } from "./sharing.types";

export function getInitialSharingState() {
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

    set({
      sharing: {
        decks: {
          ...state.sharing.decks,
          [id]: deck.date_update,
        },
      },
    });

    await state.dehydrate("app");
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

    set({
      sharing: {
        ...state.sharing,
        decks: {
          ...state.sharing.decks,
          [deck.id]: deck.date_update,
        },
      },
    });

    await state.dehydrate("app");

    return deck.id;
  },

  async deleteShare(id) {
    const state = get();

    if (!state.sharing.decks[id]) return;

    await deleteShare(selectClientId(state), id);

    const decks = { ...state.sharing.decks };
    delete decks[id];

    set({
      sharing: {
        decks,
      },
    });

    await state.dehydrate("app");
  },

  async deleteAllShares() {
    const state = get();

    const decks = { ...state.sharing.decks };

    // TODO: surface this error.
    await Promise.all(
      Object.keys(decks).map((id) => deleteShare(selectClientId(state), id)),
    ).catch(console.error);

    set({
      sharing: {
        decks: {},
      },
    });

    await state.dehydrate("app");
  },
  async importSharedDeck(importDeck) {
    const state = get();

    assert(
      !state.data.decks[importDeck.id],
      `Deck with id ${importDeck.id} already exists.`,
    );

    const deck = formatDeckImport(state, importDeck as Deck, "deck");
    assert(isDeck(deck), "Invalid deck data.");

    set({
      data: {
        ...state.data,
        decks: {
          ...state.data.decks,
          [deck.id]: deck,
        },
        history: {
          ...state.data.history,
          [deck.id]: [],
        },
      },
    });

    await state.dehydrate("app");

    return deck.id;
  },
});
