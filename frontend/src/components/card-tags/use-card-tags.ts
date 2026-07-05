import type { CardTag } from "@arkham-build/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { useSaveCardTagsMutation } from "@/queries/mutations/card-tags";
import { useStore } from "@/store";
import {
  normalizeCardTagName,
  resolveCardTagCardCode,
} from "@/store/lib/card-tags";
import type { ResolvedDeck } from "@/store/lib/types";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
} from "@/store/selectors/shared";
import type { StoreState } from "@/store/slices";
import { useToast } from "../ui/toast.hooks";

export type TagItem = {
  code: string;
  global?: boolean;
  tag: CardTag;
};

const EMPTY_TAG_NAMES: string[] = [];

export function useCardTagDisplay(
  cardCode: string,
  deck: ResolvedDeck | undefined,
) {
  return useStore((state) => selectCardTagDisplayState(state, cardCode, deck));
}

export function useCardFavorite(cardCode: string) {
  const isFavorite = useStore((state) =>
    selectCardFavoriteState(state, cardCode),
  );
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const persist = usePersistCardTags();
  const onError = useCardTagsError();

  const onToggleFavorite = useCallback(() => {
    void persist(() => toggleFavorite(cardCode)).catch(onError);
  }, [cardCode, onError, persist, toggleFavorite]);

  return {
    isFavorite,
    onToggleFavorite,
  };
}

export function useCardTags(cardCode: string) {
  const createCardTagForCard = useStore((state) => state.createCardTagForCard);
  const deleteCardTag = useStore((state) => state.deleteCardTag);
  const renameCardTag = useStore((state) => state.renameCardTag);
  const setCardTagsForCard = useStore((state) => state.setCardTagsForCard);
  const { selectedItems, tagOptions } = useStore((state) =>
    selectCardTagsState(state, cardCode),
  );
  const persist = usePersistCardTags();
  const onError = useCardTagsError();

  const onRenameTag = useCallback(
    (name: string, nextName: string) =>
      persist(() => renameCardTag(name, nextName)),
    [persist, renameCardTag],
  );

  const onDeleteTag = useCallback(
    (name: string) => persist(() => deleteCardTag(name)),
    [deleteCardTag, persist],
  );

  const onTagsChange = useCallback(
    (nextItems: TagItem[]) => {
      const nextTagNames = nextItems.map((item) => item.tag);

      void persist(() => setCardTagsForCard(cardCode, nextTagNames)).catch(
        onError,
      );
    },
    [cardCode, onError, persist, setCardTagsForCard],
  );

  const onCreateTag = useCallback(
    (name: string) => {
      void persist(() => createCardTagForCard(cardCode, name)).catch(onError);
    },
    [cardCode, createCardTagForCard, onError, persist],
  );

  return {
    onCreateTag,
    onDeleteTag,
    onError,
    onRenameTag,
    onTagsChange,
    selectedItems,
    tagOptions,
  };
}

export function useDeckCardTags(cardCode: string, deck: ResolvedDeck) {
  const updateDeckCardTags = useStore((state) => state.updateDeckCardTags);
  const { selectedItems, tagOptions } = useStore((state) =>
    selectDeckCardTagsState(state, cardCode, deck),
  );
  const onError = useCardTagsError();

  const onTagsChange = useCallback(
    (nextItems: TagItem[]) => {
      try {
        updateDeckCardTags(
          deck.id,
          cardCode,
          nextItems.map((item) => item.tag),
        );
      } catch (err) {
        onError(err);
      }
    },
    [cardCode, deck.id, onError, updateDeckCardTags],
  );

  const onCreateTag = useCallback(
    (name: string) => {
      try {
        updateDeckCardTags(deck.id, cardCode, [
          ...selectedItems.map((item) => item.tag),
          name,
        ]);
      } catch (err) {
        onError(err);
      }
    },
    [cardCode, deck.id, onError, selectedItems, updateDeckCardTags],
  );

  return {
    onCreateTag,
    onTagsChange,
    selectedItems,
    tagOptions,
  };
}

function usePersistCardTags() {
  const saveCardTags = useSaveCardTagsMutation();
  const authenticated = useStore(
    (state) => state.auth.status === "authenticated",
  );

  return useCallback(
    async (action: () => Promise<unknown>) => {
      await action();
      if (authenticated) {
        await saveCardTags.mutateAsync(undefined);
      }
    },
    [authenticated, saveCardTags],
  );
}

function useCardTagsError() {
  const { t } = useTranslation();
  const toast = useToast();

  return useCallback(
    (err: unknown) => {
      console.error(err);
      toast.show({
        children: t("card_tags.manage.error", {
          error:
            err instanceof Error
              ? err.message
              : t("card_tags.manage.unknown_error"),
        }),
        variant: "error",
      });
    },
    [t, toast],
  );
}

const selectCardFavoriteState = createSelector(
  (state: StoreState) => state.cardTags.favorites,
  (state: StoreState) => state.metadata,
  (state: StoreState) => selectLookupTables(state).relations.fronts,
  (_: StoreState, cardCode: string) => cardCode,
  (favorites, metadata, fronts, cardCode) => {
    const canonicalCode = resolveCardTagCardCode(metadata, fronts, cardCode);
    return favorites[canonicalCode] === true;
  },
);

const selectCardTagsState = createSelector(
  (state: StoreState) => state.cardTags.cardTags,
  (state: StoreState) => state.cardTags.tags,
  (state: StoreState) => state.metadata,
  (state: StoreState) => selectLookupTables(state).relations.fronts,
  selectLocaleSortingCollator,
  (_: StoreState, cardCode: string) => cardCode,
  (cardTags, tags, metadata, fronts, collator, cardCode) => {
    const canonicalCode = resolveCardTagCardCode(metadata, fronts, cardCode);
    const assignedTagNames = cardTags[canonicalCode] ?? EMPTY_TAG_NAMES;

    return {
      selectedItems: assignedTagNames.map(tagNameToAccountItem),
      tagOptions: tags
        .toSorted((a, b) => collator.compare(a, b))
        .map(tagNameToAccountItem),
    };
  },
);

const selectDeckCardTagsState = createSelector(
  (state: StoreState) => state.cardTags.tags,
  (state: StoreState) => state.metadata,
  (state: StoreState) => selectLookupTables(state).relations.fronts,
  selectLocaleSortingCollator,
  (_: StoreState, cardCode: string) => cardCode,
  (_: StoreState, __: string, deck: ResolvedDeck) => deck.deckCardTags,
  (accountTagNames, metadata, fronts, collator, cardCode, deckCardTags) => {
    const canonicalCode = resolveCardTagCardCode(metadata, fronts, cardCode);
    const assignedTagNames = deckCardTags[canonicalCode] ?? EMPTY_TAG_NAMES;
    const deckTagNames = Object.values(deckCardTags).flat();

    return {
      selectedItems: assignedTagNames.map(tagNameToDeckItem),
      tagOptions: mergeTagItems({
        accountTagNames,
        deckTagNames,
      }).toSorted((a, b) => collator.compare(a.tag, b.tag)),
    };
  },
);

const selectDeckCardTagsForCard = createSelector(
  (state: StoreState) => state.metadata,
  (state: StoreState) => selectLookupTables(state).relations.fronts,
  (_: StoreState, cardCode: string) => cardCode,
  (_: StoreState, __: string, deck: ResolvedDeck | undefined) =>
    deck?.deckCardTags,
  (metadata, fronts, cardCode, deckCardTags) => {
    if (!deckCardTags) return EMPTY_TAG_NAMES;

    const canonicalCode = resolveCardTagCardCode(metadata, fronts, cardCode);
    return deckCardTags[canonicalCode] ?? EMPTY_TAG_NAMES;
  },
);

const selectCardTagDisplayState = createSelector(
  selectCardFavoriteState,
  selectCardTagsState,
  selectDeckCardTagsForCard,
  (isFavorite, accountTags, deckTagNames) => ({
    isFavorite,
    selectedItems: mergeTagItems({
      accountTagNames: accountTags.selectedItems.map((item) => item.tag),
      deckTagNames,
    }),
    tagOptions: accountTags.tagOptions,
  }),
);

function mergeTagItems({
  accountTagNames,
  deckTagNames,
}: {
  accountTagNames: CardTag[];
  deckTagNames: CardTag[];
}) {
  const result: TagItem[] = [];
  const seen = new Set<string>();

  for (const tagName of deckTagNames) {
    const normalizedName = normalizeCardTagName(tagName);
    if (!normalizedName || seen.has(normalizedName)) continue;

    seen.add(normalizedName);
    result.push(tagNameToDeckItem(tagName));
  }

  for (const tagName of accountTagNames) {
    const normalizedName = normalizeCardTagName(tagName);
    if (!normalizedName || seen.has(normalizedName)) continue;

    seen.add(normalizedName);
    result.push({ code: normalizedName, global: true, tag: tagName });
  }

  return result;
}

function tagNameToAccountItem(tag: CardTag): TagItem {
  return { code: tag, global: true, tag };
}

function tagNameToDeckItem(tag: CardTag): TagItem {
  return { code: normalizeCardTagName(tag), tag };
}
