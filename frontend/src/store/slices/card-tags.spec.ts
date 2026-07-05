import { beforeEach, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import type { StoreState } from ".";

describe("card tags slice", () => {
  let store: StoreApi<StoreState>;

  beforeEach(async () => {
    store = await getMockStore();
  });

  it("allows a custom tag named Favorite without setting the favorite flag", async () => {
    const tagName = await store
      .getState()
      .createCardTagForCard("01016", "Favorite");

    expect(tagName).toBe("Favorite");
    expect(store.getState().cardTags.tags).toEqual(["Favorite"]);
    expect(store.getState().cardTags.cardTags["01016"]).toEqual(["Favorite"]);
    expect(store.getState().cardTags.favorites["01016"]).toBeUndefined();
  });

  it("rejects duplicate custom tag names", async () => {
    await store.getState().createCardTagForCard("01016", "Upgrade");

    await expect(
      store.getState().createCardTagForCard("01017", " upgrade "),
    ).rejects.toThrow("Card tag name must be unique.");
  });

  it("stores card tags under the canonical card code", async () => {
    const tagName = await store
      .getState()
      .createCardTagForCard("01516", "Upgrade");

    await store.getState().setCardTagsForCard("07211b", [tagName]);

    expect(store.getState().cardTags.cardTags["01016"]).toEqual([tagName]);
    expect(store.getState().cardTags.cardTags["01516"]).toBeUndefined();
    expect(store.getState().cardTags.cardTags["07211a"]).toEqual([tagName]);
    expect(store.getState().cardTags.cardTags["07211b"]).toBeUndefined();
  });

  it("toggles favorite separately from custom tag assignments", async () => {
    await store.getState().toggleFavorite("01516");

    expect(store.getState().cardTags.cardTags["01016"]).toBeUndefined();
    expect(store.getState().cardTags.favorites["01016"]).toBe(true);

    await store.getState().toggleFavorite("01516");

    expect(store.getState().cardTags.favorites["01016"]).toBeUndefined();
  });

  it("renames and deletes custom tags", async () => {
    const tagName = await store
      .getState()
      .createCardTagForCard("01016", "Upgrade");

    await store.getState().renameCardTag(tagName, "Campaign");

    expect(store.getState().cardTags.tags).toEqual(["Campaign"]);
    expect(store.getState().cardTags.cardTags["01016"]).toEqual(["Campaign"]);

    await store.getState().deleteCardTag("Campaign");

    expect(store.getState().cardTags.tags).toEqual([]);
    expect(store.getState().cardTags.cardTags["01016"]).toBeUndefined();
  });
});
