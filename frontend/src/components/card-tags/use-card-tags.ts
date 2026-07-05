import type { CardTag } from "@arkham-build/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { useSaveCardTagsMutation } from "@/queries/mutations/card-tags";
import { useStore } from "@/store";
import { resolveCardTagCardCode } from "@/store/lib/card-tags";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
} from "@/store/selectors/shared";
import type { StoreState } from "@/store/slices";
import { useToast } from "../ui/toast.hooks";

export type TagItem = {
  code: string;
  tag: CardTag;
};

const EMPTY_TAG_NAMES: string[] = [];

export function useCardTagDisplay(cardCode: string) {
  return useStore((state) => selectCardTagDisplayState(state, cardCode));
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
    const selectedItems = assignedTagNames.reduce<TagItem[]>((acc, tag) => {
      acc.push({ code: tag, tag });
      return acc;
    }, []);

    return {
      selectedItems,
      tagOptions: tags
        .toSorted((a, b) => collator.compare(a, b))
        .map<TagItem>((tag) => ({
          code: tag,
          tag,
        })),
    };
  },
);

const selectCardTagDisplayState = createSelector(
  selectCardFavoriteState,
  selectCardTagsState,
  (isFavorite, tags) => ({
    isFavorite,
    ...tags,
  }),
);
