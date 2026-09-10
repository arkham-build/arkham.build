import { type Deck, type Id, isDeck } from "@arkham-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";
import i18n from "@/utils/i18n";
import { duplicateAdapter } from "../lib/deck-crud";
import { formatDeckImport } from "../lib/deck-io";
import { dehydrate } from "../persist";
import type { HttpClient } from "../services/http-client";
import { importDeck } from "../services/requests/public-decks";
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

  async importDeck(client, input) {
    const { data, type } = await importDeck(client, input);

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
    const newDeck = duplicateAdapter.format(get(), id, options);

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

  async setDeckFolder(client, deckId, folderId) {
    set((state) => {
      if (folderId != null && folderId !== ARCHIVE_FOLDER_ID) {
        assert(
          state.data.folders[folderId],
          `Folder ${folderId} does not exist.`,
        );
      }

      const deckFolders = { ...state.data.deckFolders };

      if (folderId == null) {
        delete deckFolders[deckId];
      } else {
        deckFolders[deckId] = folderId;
      }

      if (
        folderId !== ARCHIVE_FOLDER_ID ||
        state.data.folders[ARCHIVE_FOLDER_ID]
      ) {
        return {
          data: {
            ...state.data,
            deckFolders,
          },
        };
      }

      return {
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

    await persistFolderState(get, client);
  },

  async removeDeckFromFolder(client, deckId) {
    await get().setDeckFolder(client, deckId, null);
  },
});

export function createArchiveFolder() {
  return {
    id: ARCHIVE_FOLDER_ID,
    name: i18n.t("deck_collection.archive"),
    icon: "lucide://archive",
    color: "var(--palette-1)",
  };
}

async function persistFolderState(
  get: () => StoreState,
  client: HttpClient | undefined,
) {
  await dehydrate(get(), "app");

  const state = get();
  if (state.auth.status !== "authenticated") {
    return;
  }

  assert(client, "Cannot sync folders without a client.");
  await state.saveFolders(client);
}
