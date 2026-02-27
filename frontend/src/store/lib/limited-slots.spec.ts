import limitCustomizableLevel0 from "@test/fixtures/decks/validation/customizable_level_below.json";
import limitCarolyn from "@test/fixtures/decks/validation/tag_based_access.json";
import limitCarolynInvalid from "@test/fixtures/decks/validation/tag_based_access_invalid.json";
import limitCarolynVersatile from "@test/fixtures/decks/validation/tag_based_access_versatile.json";
import limitCarolynVersatileInvalid from "@test/fixtures/decks/validation/tag_based_access_versatile_invalid.json";
import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { type Deck, DeckSchema } from "@/store/schemas/deck.schema";
import { getMockStore } from "@/test/get-mock-store";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
  selectStaticBuildQlInterpreter,
} from "../selectors/shared";
import type { StoreState } from "../slices";
import {
  type LimitedSlotOccupation,
  limitedSlotOccupation,
} from "./limited-slots";
import { resolveDeck } from "./resolve-deck";

function toSnapShot(value: LimitedSlotOccupation) {
  return {
    index: value.index,
    entries: value.entries.reduce((acc, curr) => acc + curr.quantity, 0),
  };
}

function snapshotResult(state: StoreState, deck: Deck) {
  const metadata = selectMetadata(state);
  const lookupTables = selectLookupTables(state);
  const buildQlInterpreter = selectStaticBuildQlInterpreter(state);
  const sharing = state.sharing;

  return limitedSlotOccupation(
    resolveDeck(
      { lookupTables, metadata, sharing },
      selectLocaleSortingCollator(state),
      deck,
    ),
    buildQlInterpreter,
  )?.map(toSnapShot);
}

describe("limitedSlotOccupation()", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  it("handles investigators with limit deckbuilding", () => {
    const state = store.getState();

    expect(
      snapshotResult(state, DeckSchema.parse(limitCarolyn)),
    ).toMatchInlineSnapshot(`
      [
        {
          "entries": 15,
          "index": 4,
        },
      ]
    `);

    expect(
      snapshotResult(state, DeckSchema.parse(limitCarolynInvalid)),
    ).toMatchInlineSnapshot(`
      [
        {
          "entries": 16,
          "index": 4,
        },
      ]
    `);
  });

  it("handles presence of dynamic limit deck building (versatile)", () => {
    const state = store.getState();

    expect(
      snapshotResult(state, DeckSchema.parse(limitCarolynVersatile)),
    ).toMatchInlineSnapshot(`
      [
        {
          "entries": 15,
          "index": 4,
        },
        {
          "entries": 1,
          "index": 5,
        },
      ]
    `);

    expect(
      snapshotResult(state, DeckSchema.parse(limitCarolynVersatileInvalid)),
    ).toMatchInlineSnapshot(`
      [
        {
          "entries": 15,
          "index": 4,
        },
        {
          "entries": 2,
          "index": 5,
        },
      ]
    `);
  });

  it("handles customizable deckbuilding", () => {
    const state = store.getState();

    expect(
      snapshotResult(state, DeckSchema.parse(limitCustomizableLevel0)),
    ).toMatchInlineSnapshot(`
      [
        {
          "entries": 7,
          "index": 4,
        },
      ]
    `);

    const limitCustomizableLevel1 = structuredClone(limitCustomizableLevel0);

    limitCustomizableLevel1.meta = '{"cus_09022":"0|1"}';

    expect(
      snapshotResult(state, DeckSchema.parse(limitCustomizableLevel1)),
    ).toMatchInlineSnapshot(`
      [
        {
          "entries": 5,
          "index": 4,
        },
      ]
    `);
  });
});
