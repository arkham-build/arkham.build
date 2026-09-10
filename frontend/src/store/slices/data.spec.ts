import type { Deck } from "@arkham-build/shared";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockHttpClient, getMockStore } from "@/test/get-mock-store";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";
import type { StoreState } from ".";

describe("data slice", () => {
  const client = getMockHttpClient();
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  describe("actions.deleteDeck", () => {
    const mockState = {
      data: {
        decks: {
          "1": { id: "1" } as Deck,
          "2": { id: "2", next_deck: "1" } as Deck,
          "3": { id: "3", next_deck: "2" } as Deck,
          "4": { id: "4" } as Deck,
        },
        history: {
          "1": ["2", "3"],
          "4": [],
        },
        folders: {},
        deckFolders: {},
      },
    };

    afterEach(async () => {
      store = await getMockStore();
    });

    it("does not delete decks with upgrades", async () => {
      store.setState(mockState);

      await expect(store.getState().deleteDeck(client, "2")).rejects.toThrow(
        "Cannot delete a deck that has upgrades.",
      );
    });

    it("removes a deck from state", async () => {
      store.setState(mockState);
      await store.getState().deleteDeck(client, "4");

      const state = store.getState();
      expect(state.data.decks["4"]).toBeUndefined();
      expect(state.data.history["4"]).toBeUndefined();
      expect(state.data.decks["1"]).toBeDefined();
    });

    it("removes deck and its upgrades from state", async () => {
      store.setState(mockState);
      await store.getState().deleteDeck(client, "1");

      const state = store.getState();

      expect(state.data.decks).toEqual({
        "4": { id: "4" },
      });

      expect(state.data.history).toEqual({
        "4": [],
      });
    });
  });

  describe("actions.deleteUpgrade", () => {
    afterEach(async () => {
      store = await getMockStore();
    });

    it("removes only the latest upgrade from state", async () => {
      store.setState({
        data: {
          decks: {
            "1": { id: "1", next_deck: "2" } as Deck,
            "2": { id: "2", previous_deck: "1" } as Deck,
            "3": { id: "3" } as Deck,
          },
          history: {
            "2": ["1"],
            "3": [],
          },
          folders: {},
          deckFolders: {},
        },
      });

      await store.getState().deleteUpgrade(client, "2");

      const state = store.getState();
      expect(state.data.decks).toEqual({
        "1": { id: "1", next_deck: null },
        "3": { id: "3" },
      });
      expect(state.data.history).toEqual({
        "1": [],
        "3": [],
      });
    });
  });

  describe("folder actions", () => {
    afterEach(async () => {
      store = await getMockStore();
    });

    it("auto-creates the archive folder", async () => {
      await store
        .getState()
        .setDeckFolder(undefined, "deck-id", ARCHIVE_FOLDER_ID);

      expect(store.getState().data.deckFolders["deck-id"]).toBe(
        ARCHIVE_FOLDER_ID,
      );
      expect(store.getState().data.folders[ARCHIVE_FOLDER_ID]).toMatchObject({
        id: ARCHIVE_FOLDER_ID,
      });
    });
  });

  describe("actions.duplicateDeck", () => {
    const mockState = {
      data: {
        decks: {
          "1": {
            id: "1",
            previous_deck: "2",
          } as Deck,
        },
        history: {
          "1": ["2", "3"],
        },
        folders: {},
        deckFolders: {},
      },
    };

    afterEach(async () => {
      store = await getMockStore();
    });

    it("duplicates a deck", async () => {
      store.setState(mockState);
      const id = await store.getState().duplicateDeck("1");

      const state = store.getState();

      expect(state.data.decks[id]).toMatchObject({
        id,
        previous_deck: null,
        version: "0.1",
      });

      expect(state.data.history[id]).toMatchObject([]);
    });
  });
});
