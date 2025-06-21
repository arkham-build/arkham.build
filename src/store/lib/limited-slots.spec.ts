import { beforeAll, describe, expect, it } from "vitest";

import limitCarolyn from "@/test/fixtures/decks/validation/limit_carolyn.json";
import limitCarolynInvalid from "@/test/fixtures/decks/validation/limit_carolyn_invalid.json";
import limitCarolynVersatile from "@/test/fixtures/decks/validation/limit_carolyn_versatile.json";
import limitCarolynVersatileInvalid from "@/test/fixtures/decks/validation/limit_carolyn_versatile_invalid.json";
import limitCustomizableLevel0 from "@/test/fixtures/decks/validation/limit_customizable_level_0.json";
import { getMockStore } from "@/test/get-mock-store";
import { StoreApi } from "zustand";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "../selectors/shared";
import { StoreState } from "../slices";
import { Deck } from "../slices/data.types";
import { LimitedSlotOccupation, limitedSlotOccupation } from "./limited-slots";
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
  const sharing = state.sharing;

  return limitedSlotOccupation(
    resolveDeck(
      { lookupTables, metadata, sharing },
      selectLocaleSortingCollator(state),
      deck,
    ),
  )?.map(toSnapShot);
}

describe("limitedSlotOccupation()", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  it("handles investigators with limit deckbuilding", () => {
    const state = store.getState();

    expect(snapshotResult(state, limitCarolyn)).toMatchInlineSnapshot(`
      [
        {
          "entries": 15,
          "index": 4,
        },
      ]
    `);

    expect(snapshotResult(state, limitCarolynInvalid)).toMatchInlineSnapshot(`
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
    const metadata = selectMetadata(state);
    const lookupTables = selectLookupTables(state);
    const sharing = state.sharing;

    expect(snapshotResult(state, limitCarolynVersatile)).toMatchInlineSnapshot(`
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
      snapshotResult(state, limitCarolynVersatileInvalid),
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
      snapshotResult(state, limitCustomizableLevel0),
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
      snapshotResult(state, limitCustomizableLevel1),
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
