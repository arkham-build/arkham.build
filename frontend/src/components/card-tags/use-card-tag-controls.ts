import { CARD_TAG_FAVORITE_ID, type CardTag } from "@arkham-build/shared";
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

const EMPTY_TAG_IDS: string[] = [];

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
    (id: string, name: string) => persist(() => renameCardTag(id, name)),
    [persist, renameCardTag],
  );

  const onDeleteTag = useCallback(
    (id: string) => persist(() => deleteCardTag(id)),
    [deleteCardTag, persist],
  );

  const onTagsChange = useCallback(
    (nextItems: TagItem[]) => {
      const customTagIds = nextItems
        .map((item) => item.tag.id)
        .filter((tagId) => tagId !== CARD_TAG_FAVORITE_ID);
      const nextTagIds = isFavorite
        ? [CARD_TAG_FAVORITE_ID, ...customTagIds]
        : customTagIds;

      void persist(() => setCardTagsForCard(cardCode, nextTagIds)).catch(
        onError,
      );
    },
    [cardCode, isFavorite, onError, persist, setCardTagsForCard],
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
  (state: StoreState) => state.cardTags.tags,
  (state: StoreState) => state.metadata,
  (state: StoreState) => selectLookupTables(state).relations.fronts,
  selectLocaleSortingCollator,
  (_: StoreState, cardCode: string) => cardCode,
  (cardTags, tags, metadata, fronts, collator, cardCode) => {
    const canonicalCode = resolveCardTagCardCode(metadata, fronts, cardCode);
    const assignedTagIds = cardTags[canonicalCode] ?? EMPTY_TAG_IDS;
    const selectedItems = assignedTagIds.reduce<TagItem[]>((acc, tagId) => {
      const tag = tags[tagId];
      if (tag) {
        acc.push({ code: tag.id, tag });
      }
      return acc;
    }, []);

    return {
      isFavorite: assignedTagIds.includes(CARD_TAG_FAVORITE_ID),
      selectedItems,
      tagOptions: Object.values(tags)
        .sort((a, b) => collator.compare(a.name, b.name))
        .map<TagItem>((tag) => ({
          code: tag.id,
          tag,
        })),
    };
  },
);
