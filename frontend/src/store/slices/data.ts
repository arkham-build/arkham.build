import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";
import i18n from "@/utils/i18n";
import { applyDeckEdits } from "../lib/deck-edits";
import { cloneDeck } from "../lib/deck-factory";
import { formatDeckImport } from "../lib/deck-io";
import { dehydrate } from "../persist";
import { type Deck, type Id, isDeck } from "../schemas/deck.schema";
import { selectClientId, selectMetadata } from "../selectors/shared";
import { importDeck } from "../services/queries";
import type { StoreState } from ".";
import type { DataSlice } from "./data.types";

function getInitialDataState() {
  return {
    data: {
      decks: {},
      history: {},
      folders: {},
      deckFolders: {},
    },
  };
}

export const createDataSlice: StateCreator<StoreState, [], [], DataSlice> = (
  set,
  get,
) => ({
  ...getInitialDataState(),

  async importDeck(input) {
    const { data, type } = await importDeck(selectClientId(get()), input);

    set((state) => {
      const deck = formatDeckImport(state, data, type);
      return {
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
      };
    });

    await dehydrate(get(), "app");
  },

  async importFromFiles(files) {
    const decks: Deck[] = await Promise.all(
      Array.from(files).map((file) => file.text().then(JSON.parse)),
    ).then((res) => res.filter(isDeck));

    get().cacheFanMadeContent(decks);

    const formatted = decks.map((deck) =>
      formatDeckImport(get(), deck, "deck"),
    );

    set((state) => ({
      data: {
        ...state.data,
        decks: {
          ...state.data.decks,
          ...formatted.reduce<Record<Id, Deck>>((acc, deck) => {
            acc[deck.id] = deck;
            return acc;
          }, {}),
        },
        history: {
          ...state.data.history,
          ...formatted.reduce<Record<Id, string[]>>((acc, deck) => {
            acc[deck.id] = [];
            return acc;
          }, {}),
        },
      },
    }));

    await dehydrate(get(), "app");
  },

  async duplicateDeck(id, options) {
    const state = get();
    const metadata = selectMetadata(state);

    const deck = state.data.decks[id];
    assert(deck, `Deck ${id} does not exist.`);

    const newDeck = options?.applyEdits
      ? cloneDeck(applyDeckEdits(deck, state.deckEdits[id], metadata, true))
      : cloneDeck(deck);

    set((prev) => ({
      data: {
        ...prev.data,
        decks: {
          ...prev.data.decks,
          [newDeck.id]: newDeck,
        },
        history: {
          ...prev.data.history,
          [newDeck.id]: [],
        },
      },
    }));

    await dehydrate(get(), "app");

    return newDeck.id;
  },
  async addDeckToArchive(deckId) {
    set((state) => {
      const archive = state.data.folders[ARCHIVE_FOLDER_ID];

      const deckFolders = {
        ...state.data.deckFolders,
        [deckId]: ARCHIVE_FOLDER_ID,
      };

      return archive
        ? {
            data: {
              ...state.data,
              deckFolders,
            },
          }
        : {
            data: {
              ...state.data,
              folders: {
                ...state.data.folders,
                [ARCHIVE_FOLDER_ID]: createArchiveFolder(),
              },
              deckFolders,
            },
          };
    });

    await dehydrate(get(), "app");
  },
  async removeDeckFromFolder(deckId) {
    set((state) => {
      const deckFolders = { ...state.data.deckFolders };
      delete deckFolders[deckId];
      return {
        data: {
          ...state.data,
          deckFolders,
        },
      };
    });

    await dehydrate(get(), "app");
  },
});

function createArchiveFolder() {
  return {
    id: ARCHIVE_FOLDER_ID,
    name: i18n.t("deck_collection.archive"),
    icon: "lucide://archive",
    color: "var(--palette-1)",
  };
}
