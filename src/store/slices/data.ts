import { assert } from "@/utils/assert";
import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import { applyDeckEdits } from "../lib/deck-edits";
import { cloneDeck } from "../lib/deck-factory";
import { formatDeckImport } from "../lib/deck-io";
import { selectClientId, selectMetadata } from "../selectors/shared";
import { importDeck } from "../services/queries";
import { type DataSlice, type Deck, type Id, isDeck } from "./data.types";

export function getInitialDataState() {
  return {
    data: {
      decks: {},
      history: {},
    },
  };
}

export const createDataSlice: StateCreator<StoreState, [], [], DataSlice> = (
  set,
  get,
) => ({
  ...getInitialDataState(),

  async importDeck(input) {
    const state = get();

    const { data, type } = await importDeck(selectClientId(state), input);

    const deck = formatDeckImport(state, data, type);

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

    state.dehydrate("app");
  },

  async importFromFiles(files) {
    const state = get();
    const decks = [];

    for (const file of files) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        assert(isDeck(parsed), `file '${file.name}' is not an arkhamdb deck`);
        const deck = formatDeckImport(state, parsed, "deck");

        decks.push(deck);
      } catch (err) {
        console.error(`could not import deck '${file.name}':`, err);
      }
    }

    set({
      data: {
        ...state.data,
        decks: {
          ...state.data.decks,
          ...decks.reduce<Record<Id, Deck>>((acc, deck) => {
            acc[deck.id] = deck;
            return acc;
          }, {}),
        },
        history: {
          ...state.data.history,
          ...decks.reduce<Record<Id, string[]>>((acc, deck) => {
            acc[deck.id] = [];
            return acc;
          }, {}),
        },
      },
    });

    state.dehydrate("app");
  },

  async duplicateDeck(id, options) {
    const state = get();
    const metadata = selectMetadata(state);

    const deck = state.data.decks[id];
    assert(deck, `Deck ${id} does not exist.`);

    const newDeck = options?.applyEdits
      ? cloneDeck(applyDeckEdits(deck, state.deckEdits[id], metadata, true))
      : cloneDeck(deck);

    set({
      data: {
        ...state.data,
        decks: {
          ...state.data.decks,
          [newDeck.id]: newDeck,
        },
        history: {
          ...state.data.history,
          [newDeck.id]: [],
        },
      },
    });

    await state.dehydrate("app");

    return newDeck.id;
  },
});
