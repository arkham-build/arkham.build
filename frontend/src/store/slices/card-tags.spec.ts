import { CARD_TAG_FAVORITE_ID } from "@arkham-build/shared";
import { beforeEach, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import type { StoreState } from ".";

describe("card tags slice", () => {
  let store: StoreApi<StoreState>;

  beforeEach(async () => {
    store = await getMockStore();
  });

  it("allows a custom tag named Favorite without storing the favorite system tag", async () => {
    const tagId = await store
      .getState()
      .createCardTagForCard("01016", "Favorite");

    expect(tagId).not.toBe(CARD_TAG_FAVORITE_ID);
    expect(store.getState().cardTags.tags[tagId]).toMatchObject({
      id: tagId,
      name: "Favorite",
    });
    expect(store.getState().cardTags.cardTags["01016"]).toEqual([tagId]);
    expect(
      store.getState().cardTags.tags[CARD_TAG_FAVORITE_ID],
    ).toBeUndefined();
  });

  it("rejects duplicate custom tag names", async () => {
    await store.getState().createCardTagForCard("01016", "Upgrade");

    await expect(
      store.getState().createCardTagForCard("01017", " upgrade "),
    ).rejects.toThrow("Card tag name must be unique.");
  });

  it("stores card tags under the canonical card code", async () => {
    const tagId = await store
      .getState()
      .createCardTagForCard("01516", "Upgrade");

    await store.getState().setCardTagsForCard("07211b", [tagId]);

    expect(store.getState().cardTags.cardTags["01016"]).toEqual([tagId]);
    expect(store.getState().cardTags.cardTags["01516"]).toBeUndefined();
    expect(store.getState().cardTags.cardTags["07211a"]).toEqual([tagId]);
    expect(store.getState().cardTags.cardTags["07211b"]).toBeUndefined();
  });

  it("toggles favorite as a virtual tag assignment", async () => {
    await store.getState().toggleFavorite("01516");

    expect(
      store.getState().cardTags.tags[CARD_TAG_FAVORITE_ID],
    ).toBeUndefined();
    expect(store.getState().cardTags.cardTags["01016"]).toEqual([
      CARD_TAG_FAVORITE_ID,
    ]);

    await store.getState().toggleFavorite("01516");

    expect(store.getState().cardTags.cardTags["01016"]).toBeUndefined();
  });

  it("renames and deletes custom tags", async () => {
    const tagId = await store
      .getState()
      .createCardTagForCard("01016", "Upgrade");

    await store.getState().renameCardTag(tagId, "Campaign");

    expect(store.getState().cardTags.tags[tagId]?.name).toBe("Campaign");

    await store.getState().deleteCardTag(tagId);

    expect(store.getState().cardTags.tags[tagId]).toBeUndefined();
    expect(store.getState().cardTags.cardTags["01016"]).toBeUndefined();
  });

  it("does not allow modifying or deleting the favorite system tag", async () => {
    await expect(
      store.getState().renameCardTag(CARD_TAG_FAVORITE_ID, "Favorites"),
    ).rejects.toThrow("Favorite tag cannot be modified.");

    await expect(
      store.getState().deleteCardTag(CARD_TAG_FAVORITE_ID),
    ).rejects.toThrow("Favorite tag cannot be deleted.");
  });
});
