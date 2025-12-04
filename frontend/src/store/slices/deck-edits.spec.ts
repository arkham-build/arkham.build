import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import deckAttachments from "@/test/fixtures/decks/deck_attachments.json";
import deckExtraSlots from "@/test/fixtures/decks/extra_slots.json";
import { getMockStore } from "@/test/get-mock-store";
import { DeckSchema } from "../schemas/deck.schema";
import { selectResolvedDeckById } from "../selectors/decks";
import type { StoreState } from ".";

describe("deck-view slice", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  describe("updateCardQuantity", () => {
    beforeEach(() => {
      store.setState({
        deckEdits: {},
        data: {
          decks: {
            "deck-id": DeckSchema.parse(deckExtraSlots),
          },
          history: {
            "deck-id": [],
          },
          folders: {},
          deckFolders: {},
        },
      });
    });

    it("increments the quantity of a card", () => {
      const state = store.getState();
      state.updateCardQuantity("deck-id", "01000", 1, 2, "slots", "increment");
      expect(
        selectResolvedDeckById(store.getState(), "deck-id", true)?.slots[
          "01000"
        ],
      ).toEqual(2);
    });

    it("decrements the quantity of a card", () => {
      const state = store.getState();

      state.updateCardQuantity("deck-id", "01000", -1, 2, "slots", "increment");

      const resolved = selectResolvedDeckById(
        store.getState(),
        "deck-id",
        true,
      );

      expect(resolved?.slots["01000"]).toEqual(0);
    });

    it("sets the quantity of a card", () => {
      const state = store.getState();
      state.updateCardQuantity("deck-id", "01000", 5, 5, "slots", "set");
      expect(
        selectResolvedDeckById(store.getState(), "deck-id", true)?.slots[
          "01000"
        ],
      ).toEqual(5);
    });

    it("does not set the quantity of a card to a negative value", () => {
      const state = store.getState();
      state.updateCardQuantity("deck-id", "01000", -5, 5, "slots", "set");
      state.updateCardQuantity("deck-id", "01000", -5, 5, "slots", "increment");
      expect(
        selectResolvedDeckById(store.getState(), "deck-id", true)?.slots[
          "01000"
        ],
      ).toEqual(0);
    });

    it("does not set the quantity of a card exceeding the limit", () => {
      const state = store.getState();
      state.updateCardQuantity("deck-id", "06021", 5, 3, "slots", "set");
      state.updateCardQuantity("deck-id", "06021", 5, 3, "slots", "increment");
      expect(
        selectResolvedDeckById(store.getState(), "deck-id", true)?.slots[
          "06021"
        ],
      ).toEqual(3);
    });

    it("adjusts cards in side slots", () => {
      const state = store.getState();
      state.updateCardQuantity(
        "deck-id",
        "06021",
        1,
        2,
        "sideSlots",
        "increment",
      );
      expect(
        selectResolvedDeckById(store.getState(), "deck-id", true)?.sideSlots?.[
          "06021"
        ],
      ).toEqual(1);
    });

    describe("attachments", () => {
      beforeEach(() => {
        store.setState({
          deckEdits: {},
          data: {
            decks: {
              "deck-id": deckAttachments,
            },
            history: {
              "deck-id": [],
            },
            folders: {},
            deckFolders: {},
          },
        });
      });

      it("adjusts attachment quantities if attached card changes quantity", () => {
        const state = store.getState();

        state.updateCardQuantity(
          "deck-id",
          "07305",
          -1,
          2,
          "slots",
          "increment",
        );

        expect(
          selectResolvedDeckById(store.getState(), "deck-id", true)?.meta,
        ).toMatchInlineSnapshot(
          `"{"attachments_09077":"07305,02109","attachments_03264":"02109"}"`,
        );

        state.updateCardQuantity(
          "deck-id",
          "07305",
          -1,
          2,
          "slots",
          "increment",
        );

        expect(
          selectResolvedDeckById(store.getState(), "deck-id", true)?.meta,
        ).toMatchInlineSnapshot(
          `"{"attachments_09077":"02109","attachments_03264":"02109"}"`,
        );
      });

      it("adjusts attachment quantities if attached card is attached to multiple attachables", () => {
        const state = store.getState();

        state.updateCardQuantity(
          "deck-id",
          "02109",
          -1,
          2,
          "slots",
          "increment",
        );

        expect(
          selectResolvedDeckById(store.getState(), "deck-id", true)?.meta,
        ).toMatchInlineSnapshot(
          `"{"attachments_09077":"07305,07305,02109","attachments_03264":null}"`,
        );

        state.updateCardQuantity(
          "deck-id",
          "02109",
          -1,
          2,
          "slots",
          "increment",
        );

        expect(
          selectResolvedDeckById(store.getState(), "deck-id", true)?.meta,
        ).toMatchInlineSnapshot(
          `"{"attachments_09077":"07305,07305","attachments_03264":null}"`,
        );
      });
    });
  });
});
