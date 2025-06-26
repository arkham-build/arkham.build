import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import type { StoreState } from "@/store/slices";
import { getMockStore } from "@/test/get-mock-store";
import { countExperience } from "./card-utils";

describe("countExperience", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  it("handles base case", () => {
    const card = store.getState().metadata.cards["60127"];
    expect(countExperience(card, 2)).toEqual(6);
  });

  it("handles case: chained", () => {
    const card = store.getState().metadata.cards["60127"];
    card.taboo_xp = -1;
    expect(countExperience(card, 2)).toEqual(4);
  });

  it("handles myriad", () => {
    const card = store.getState().metadata.cards["06328"];
    expect(countExperience(card, 3)).toEqual(2);
  });

  it("handles exceptional: base case", () => {
    const card = store.getState().metadata.cards["08053"];
    expect(countExperience(card, 1)).toEqual(4);
  });

  it("handles exceptional: chained", () => {
    const card = store.getState().metadata.cards["08053"];
    card.taboo_xp = 1;
    expect(countExperience(card, 1)).toEqual(5);
  });
});
