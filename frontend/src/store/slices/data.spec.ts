import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import type { Deck } from "@/store/schemas/deck.schema";
import { getMockStore } from "@/test/get-mock-store";
import type { StoreState } from ".";

describe("data slice", () => {
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

      try {
        await store.getState().deleteDeck("2");
      } catch (err) {
        expect((err as Error).message).toMatchInlineSnapshot(
          `"Cannot delete a deck that has upgrades."`,
        );
      }
    });

    it("removes a deck from state", async () => {
      store.setState(mockState);
      await store.getState().deleteDeck("4");

      const state = store.getState();
      expect(state.data.decks["4"]).toBeUndefined();
      expect(state.data.history["4"]).toBeUndefined();
      expect(state.data.decks["1"]).toBeDefined();
    });

    it("removes deck and its upgrades from state", async () => {
      store.setState(mockState);
      await store.getState().deleteDeck("1");

      const state = store.getState();

      expect(state.data.decks).toEqual({
        "4": { id: "4" },
      });

      expect(state.data.history).toEqual({
        "4": [],
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
