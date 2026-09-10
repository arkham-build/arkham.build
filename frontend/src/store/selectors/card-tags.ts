import { type CardTag, normalizeCardTagName } from "@arkham-build/shared";
import { createSelector } from "reselect";
import { mergeCardTagNames, resolveCardTagCardCode } from "../lib/card-tags";
import type { ResolvedDeck } from "../lib/types";
import type { StoreState } from "../slices";
import { selectLocaleSortingCollator, selectLookupTables } from "./shared";

export type TagItem = { code: string; global?: boolean; tag: CardTag };

const EMPTY_TAG_NAMES: string[] = [];

const selectCanonicalCardTagCode = createSelector(
  (state: StoreState) => state.metadata,
  (state: StoreState) => selectLookupTables(state).relations.fronts,
  (_: StoreState, cardCode: string) => cardCode,
  resolveCardTagCardCode,
);

export const selectCardFavoriteState = createSelector(
  (state: StoreState) => state.cardTags.favorites,
  selectCanonicalCardTagCode,
  (favorites, canonicalCode) => favorites?.[canonicalCode] === true,
);

const selectAccountCardTagNamesForCard = createSelector(
  (state: StoreState) => state.cardTags.cardTags,
  selectCanonicalCardTagCode,
  (cardTags, canonicalCode) => cardTags[canonicalCode] ?? EMPTY_TAG_NAMES,
);

export const selectCardTagsState = createSelector(
  selectAccountCardTagNamesForCard,
  (state: StoreState) => state.cardTags.tags,
  selectLocaleSortingCollator,
  (assignedTagNames, tags, collator) => ({
    selectedItems: assignedTagNames.map(tagNameToAccountItem),
    tagOptions: tags
      .toSorted((a, b) => collator.compare(a, b))
      .map(tagNameToAccountItem),
  }),
);

const selectDeckCardTagsForCard = createSelector(
  selectCanonicalCardTagCode,
  (_: StoreState, __: string, deck: ResolvedDeck | undefined) =>
    deck?.deckCardTags,
  (canonicalCode, deckCardTags) =>
    deckCardTags?.[canonicalCode] ?? EMPTY_TAG_NAMES,
);

export const selectDeckCardTagsState = createSelector(
  (state: StoreState) => state.cardTags.tags,
  (_: StoreState, __: string, deck: ResolvedDeck) => deck.deckCardTags,
  selectDeckCardTagsForCard,
  selectLocaleSortingCollator,
  (accountTagNames, deckCardTags, assignedTagNames, collator) => ({
    selectedItems: assignedTagNames.map(tagNameToDeckItem),
    tagOptions: mergeTagItems(
      accountTagNames,
      Object.values(deckCardTags).flat(),
    ).toSorted((a, b) => collator.compare(a.tag, b.tag)),
  }),
);

export const selectCardTagDisplayState = createSelector(
  selectCardFavoriteState,
  selectAccountCardTagNamesForCard,
  selectDeckCardTagsForCard,
  (isFavorite, accountTagNames, deckTagNames) => ({
    isFavorite,
    selectedItems: mergeTagItems(accountTagNames, deckTagNames),
  }),
);

function mergeTagItems(accountTagNames: CardTag[], deckTagNames: CardTag[]) {
  const deckCodes = new Set(deckTagNames.map(normalizeCardTagName));

  return mergeCardTagNames(deckTagNames, accountTagNames).map((tagName) => {
    const code = normalizeCardTagName(tagName);

    return deckCodes.has(code)
      ? { code, tag: tagName }
      : { code, global: true, tag: tagName };
  });
}

function tagNameToAccountItem(tag: CardTag): TagItem {
  return { code: tag, global: true, tag };
}

function tagNameToDeckItem(tag: CardTag): TagItem {
  return { code: normalizeCardTagName(tag), tag };
}
