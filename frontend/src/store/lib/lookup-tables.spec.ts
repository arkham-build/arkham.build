import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import {
  selectLookupTables,
  selectPrintingsForCard,
} from "../selectors/shared";
import type { StoreState } from "../slices";

describe("lookup-tables", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  it("handles kate signature edge case", () => {
    const lookupTables = selectLookupTables(store.getState());
    expect(
      lookupTables.relations.requiredCards["10004"],
    ).toMatchInlineSnapshot(`
      {
        "10005": 1,
        "10008": 1,
      }
    `);
  });

  it("includes duplicate printings for reprints", () => {
    const printings = selectPrintingsForCard(store.getState(), "12039");

    expect(printings.map((printing) => printing.card.code)).toEqual([
      "01039",
      "01539",
      "12039",
      "60219",
      "60267",
    ]);
  });
});
