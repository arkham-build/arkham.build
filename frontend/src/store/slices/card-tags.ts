import { CARD_TAG_FAVORITE_ID, CardTagSchema } from "@arkham-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { randomId } from "@/utils/crypto";
import {
  canonicalizeCardTagsState,
  getEmptyCardTagsState,
  isKnownCardTagId,
  normalizeCardTagName,
  resolveCardTagCardCode,
} from "../lib/card-tags";
import { dehydrate } from "../persist";
import { selectLookupTables } from "../selectors/shared";
import type { StoreState } from ".";
import type { CardTagsSlice, CardTagsSliceState } from "./card-tags.types";

export function getInitialCardTagsState(): CardTagsSliceState {
  return {
    cardTags: getEmptyCardTagsState(),
  };
}

export const createCardTagsSlice: StateCreator<
  StoreState,
  [],
  [],
  CardTagsSlice
> = (set, get) => ({
  ...getInitialCardTagsState(),

  async applyCardTagsState(cardTags) {
    set((state) => ({
      cardTags: canonicalizeCardTagsState(
        cardTags,
        state.metadata,
        selectLookupTables(state).relations.fronts,
      ),
    }));

    await dehydrate(get(), "app");
  },

  async createCardTagForCard(cardCode, name) {
    const state = get();
    const tag = createCardTag(state.cardTags.tags, name);
    const canonicalCode = getCardTagCardCode(state, cardCode);

    set((state) => ({
      cardTags: setCardTagIdsForCanonicalCode(
        {
          tags: {
            ...state.cardTags.tags,
            [tag.id]: tag,
          },
          cardTags: state.cardTags.cardTags,
        },
        canonicalCode,
        [...(state.cardTags.cardTags[canonicalCode] ?? []), tag.id],
      ),
    }));

    await dehydrate(get(), "app");
    return tag.id;
  },

  async renameCardTag(id, name) {
    assertCustomTagExists(get().cardTags.tags, id);

    const tag = CardTagSchema.parse({ id, name });
    assertUniqueTagName(get().cardTags.tags, tag.name, id);

    set((state) => ({
      cardTags: {
        ...state.cardTags,
        tags: {
          ...state.cardTags.tags,
          [id]: tag,
        },
      },
    }));

    await dehydrate(get(), "app");
  },

  async deleteCardTag(id) {
    assert(id !== CARD_TAG_FAVORITE_ID, "Favorite tag cannot be deleted.");

    set((state) => {
      if (!state.cardTags.tags[id]) return {};

      const tags = { ...state.cardTags.tags };
      delete tags[id];

      const cardTags: StoreState["cardTags"]["cardTags"] = {};

      for (const [cardCode, tagIds] of Object.entries(
        state.cardTags.cardTags,
      )) {
        const filteredTagIds = tagIds.filter((tagId) => tagId !== id);
        if (filteredTagIds.length) {
          cardTags[cardCode] = filteredTagIds;
        }
      }

      return {
        cardTags: {
          tags,
          cardTags,
        },
      };
    });

    await dehydrate(get(), "app");
  },

  async setCardTagsForCard(cardCode, tagIds) {
    const state = get();

    for (const tagId of tagIds) {
      assertKnownTagId(state.cardTags.tags, tagId);
    }

    const canonicalCode = getCardTagCardCode(state, cardCode);

    set((state) => ({
      cardTags: setCardTagIdsForCanonicalCode(
        state.cardTags,
        canonicalCode,
        tagIds,
      ),
    }));

    await dehydrate(get(), "app");
  },

  async toggleFavorite(cardCode) {
    const state = get();
    const canonicalCode = getCardTagCardCode(state, cardCode);
    const current = state.cardTags.cardTags[canonicalCode] ?? [];
    const tagIds = current.includes(CARD_TAG_FAVORITE_ID)
      ? current.filter((tagId) => tagId !== CARD_TAG_FAVORITE_ID)
      : [...current, CARD_TAG_FAVORITE_ID];

    set((state) => ({
      cardTags: setCardTagIdsForCanonicalCode(
        state.cardTags,
        canonicalCode,
        tagIds,
      ),
    }));

    await dehydrate(get(), "app");
  },
});

function createCardTag(tags: StoreState["cardTags"]["tags"], name: string) {
  const tag = CardTagSchema.parse({
    id: randomId(),
    name,
  });

  assertUniqueTagName(tags, tag.name);
  return tag;
}

function setCardTagIdsForCanonicalCode(
  state: StoreState["cardTags"],
  canonicalCode: string,
  tagIds: string[],
): StoreState["cardTags"] {
  const nextTagIds = Array.from(new Set(tagIds));
  const cardTags = { ...state.cardTags };

  if (nextTagIds.length) {
    cardTags[canonicalCode] = nextTagIds;
  } else {
    delete cardTags[canonicalCode];
  }

  return {
    ...state,
    cardTags,
  };
}

function getCardTagCardCode(state: StoreState, cardCode: string) {
  return resolveCardTagCardCode(
    state.metadata,
    selectLookupTables(state).relations.fronts,
    cardCode,
  );
}

function assertCustomTagExists(
  tags: StoreState["cardTags"]["tags"],
  id: string,
) {
  assert(id !== CARD_TAG_FAVORITE_ID, "Favorite tag cannot be modified.");
  assertKnownTagId(tags, id);
}

function assertKnownTagId(tags: StoreState["cardTags"]["tags"], id: string) {
  assert(isKnownCardTagId(tags, id), `Card tag ${id} does not exist.`);
}

function assertUniqueTagName(
  tags: StoreState["cardTags"]["tags"],
  name: string,
  ignoreId?: string,
) {
  const normalizedName = normalizeCardTagName(name);

  for (const tag of Object.values(tags)) {
    if (tag.id === ignoreId) continue;

    assert(
      normalizeCardTagName(tag.name) !== normalizedName,
      "Card tag name must be unique.",
    );
  }
}
