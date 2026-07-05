import { CardTagSchema } from "@arkham-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import {
  canonicalizeCardTagsState,
  getEmptyCardTagsState,
  isKnownCardTagName,
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
    const tagName = createCardTagName(state.cardTags.tags, name);
    const canonicalCode = getCardTagCardCode(state, cardCode);

    set((state) => ({
      cardTags: setCardTagNamesForCanonicalCode(
        {
          ...state.cardTags,
          tags: [...state.cardTags.tags, tagName],
        },
        canonicalCode,
        [...(state.cardTags.cardTags[canonicalCode] ?? []), tagName],
      ),
    }));

    await dehydrate(get(), "app");
    return tagName;
  },

  async renameCardTag(name, nextName) {
    assertCustomTagExists(get().cardTags.tags, name);

    const tagName = CardTagSchema.parse(nextName);
    assertUniqueTagName(get().cardTags.tags, tagName, name);

    set((state) => {
      const cardTags: StoreState["cardTags"]["cardTags"] = {};

      for (const [cardCode, tagNames] of Object.entries(
        state.cardTags.cardTags,
      )) {
        cardTags[cardCode] = tagNames.map((currentName) =>
          currentName === name ? tagName : currentName,
        );
      }

      return {
        cardTags: {
          ...state.cardTags,
          tags: state.cardTags.tags.map((currentName) =>
            currentName === name ? tagName : currentName,
          ),
          cardTags,
        },
      };
    });

    await dehydrate(get(), "app");
  },

  async deleteCardTag(name) {
    assertCustomTagExists(get().cardTags.tags, name);

    set((state) => {
      const cardTags: StoreState["cardTags"]["cardTags"] = {};

      for (const [cardCode, tagNames] of Object.entries(
        state.cardTags.cardTags,
      )) {
        const filteredTagNames = tagNames.filter((tagName) => tagName !== name);
        if (filteredTagNames.length) {
          cardTags[cardCode] = filteredTagNames;
        }
      }

      return {
        cardTags: {
          ...state.cardTags,
          tags: state.cardTags.tags.filter((tagName) => tagName !== name),
          cardTags,
        },
      };
    });

    await dehydrate(get(), "app");
  },

  async setCardTagsForCard(cardCode, tagNames) {
    const state = get();

    for (const tagName of tagNames) {
      assertKnownTagName(state.cardTags.tags, tagName);
    }

    const canonicalCode = getCardTagCardCode(state, cardCode);

    set((state) => ({
      cardTags: setCardTagNamesForCanonicalCode(
        state.cardTags,
        canonicalCode,
        tagNames,
      ),
    }));

    await dehydrate(get(), "app");
  },

  async toggleFavorite(cardCode) {
    const state = get();
    const canonicalCode = getCardTagCardCode(state, cardCode);

    set((state) => {
      const favorites = { ...state.cardTags.favorites };

      if (favorites[canonicalCode]) {
        delete favorites[canonicalCode];
      } else {
        favorites[canonicalCode] = true;
      }

      return {
        cardTags: {
          ...state.cardTags,
          favorites,
        },
      };
    });

    await dehydrate(get(), "app");
  },
});

function createCardTagName(tags: StoreState["cardTags"]["tags"], name: string) {
  const tagName = CardTagSchema.parse(name);
  assertUniqueTagName(tags, tagName);
  return tagName;
}

function setCardTagNamesForCanonicalCode(
  state: StoreState["cardTags"],
  canonicalCode: string,
  tagNames: string[],
): StoreState["cardTags"] {
  const nextTagNames = Array.from(new Set(tagNames));
  const cardTags = { ...state.cardTags };

  if (nextTagNames.length) {
    cardTags[canonicalCode] = nextTagNames;
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
  name: string,
) {
  assertKnownTagName(tags, name);
}

function assertKnownTagName(
  tags: StoreState["cardTags"]["tags"],
  name: string,
) {
  assert(isKnownCardTagName(tags, name), `Card tag ${name} does not exist.`);
}

function assertUniqueTagName(
  tags: StoreState["cardTags"]["tags"],
  name: string,
  ignoreName?: string,
) {
  const normalizedName = normalizeCardTagName(name);

  for (const tagName of tags) {
    if (tagName === ignoreName) continue;

    assert(
      normalizeCardTagName(tagName) !== normalizedName,
      "Card tag name must be unique.",
    );
  }
}
