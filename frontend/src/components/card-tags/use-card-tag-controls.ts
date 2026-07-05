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

export function useCardTagControls(cardCode: string) {
  const { t } = useTranslation();
  const saveCardTags = useSaveCardTagsMutation();
  const toast = useToast();

  const createCardTagForCard = useStore((state) => state.createCardTagForCard);
  const deleteCardTag = useStore((state) => state.deleteCardTag);
  const renameCardTag = useStore((state) => state.renameCardTag);
  const setCardTagsForCard = useStore((state) => state.setCardTagsForCard);
  const toggleFavorite = useStore((state) => state.toggleFavorite);

  const authenticated = useStore(
    (state) => state.auth.status === "authenticated",
  );
  const { isFavorite, selectedItems, tagOptions } = useCardTagDisplay(cardCode);

  const persist = useCallback(
    async (action: () => Promise<unknown>) => {
      await action();
      if (authenticated) {
        await saveCardTags.mutateAsync(undefined);
      }
    },
    [authenticated, saveCardTags],
  );

  const onError = useCallback(
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

  const onToggleFavorite = useCallback(() => {
    void persist(() => toggleFavorite(cardCode)).catch(onError);
  }, [cardCode, onError, persist, toggleFavorite]);

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
    isFavorite,
    onCreateTag,
    onDeleteTag,
    onError,
    onRenameTag,
    onTagsChange,
    onToggleFavorite,
    selectedItems,
    tagOptions,
  };
}

const selectCardTagDisplayState = createSelector(
  (state: StoreState) => state.cardTags.cardTags,
  (state: StoreState) => state.cardTags.favorites,
  (state: StoreState) => state.cardTags.tags,
  (state: StoreState) => state.metadata,
  (state: StoreState) => selectLookupTables(state).relations.fronts,
  selectLocaleSortingCollator,
  (_: StoreState, cardCode: string) => cardCode,
  (cardTags, favorites, tags, metadata, fronts, collator, cardCode) => {
    const canonicalCode = resolveCardTagCardCode(metadata, fronts, cardCode);
    const assignedTagNames = cardTags[canonicalCode] ?? EMPTY_TAG_NAMES;
    const selectedItems = assignedTagNames.reduce<TagItem[]>((acc, tag) => {
      acc.push({ code: tag, tag });
      return acc;
    }, []);

    return {
      isFavorite: favorites[canonicalCode] === true,
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
