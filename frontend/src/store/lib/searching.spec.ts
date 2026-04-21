import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import type { StoreState } from "../slices";
import type { Search } from "../slices/lists.types";
import { applySearch } from "./searching";

describe("searching", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  it("matches backside text double-sided cards", () => {
    const state = store.getState();
    const card = state.metadata.cards["02063"];
    const search = makeSearch("completed Extracurricular Activity", {
      includeBacks: true,
      includeGameText: true,
    });

    expect(card.real_back_text).toContain("completed Extracurricular Activity");
    expect(applySearch(search, [card], state.metadata)).toEqual([card]);
  });

  it("matches backside flavor double-sided cards without backside text", () => {
    const state = store.getState();
    const card = state.metadata.cards["09605"];
    const search = makeSearch("otherworldly figures prowling its halls", {
      includeBacks: true,
      includeFlavor: true,
    });

    expect(card.real_back_text).toBeFalsy();
    expect(card.real_back_flavor).toContain(
      "otherworldly figures prowling its halls",
    );
    expect(applySearch(search, [card], state.metadata)).toEqual([card]);
  });

  it("matches backside names on double-sided cards without backside text", () => {
    const state = store.getState();
    const card = state.metadata.cards["02077"];
    const search = makeSearch("Back Hall Doorway", {
      includeBacks: true,
      includeName: true,
    });

    expect(card.real_back_text).toBeFalsy();
    expect(card.real_back_name).toBe("Back Hall Doorway");
    expect(applySearch(search, [card], state.metadata)).toEqual([card]);
  });
});

function makeSearch(value: string, overrides: Partial<Search> = {}): Search {
  return {
    includeBacks: false,
    includeFlavor: false,
    includeGameText: false,
    includeName: false,
    mode: "simple",
    value,
    ...overrides,
  };
}
