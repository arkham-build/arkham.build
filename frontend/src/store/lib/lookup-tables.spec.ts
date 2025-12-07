import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import { selectLookupTables } from "../selectors/shared";
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
});
