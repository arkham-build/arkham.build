import { getMockStore } from "@/test/get-mock-store";
import { beforeAll, describe, expect, it } from "vitest";
import { StoreApi } from "zustand";
import { StoreState } from ".";
import { selectLookupTables } from "../selectors/shared";

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
});
