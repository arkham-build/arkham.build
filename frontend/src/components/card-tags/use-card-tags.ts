import { useTranslation } from "react-i18next";
import { useSaveCardTagsMutation } from "@/queries/mutations/card-tags";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import {
  selectCardFavoriteState,
  selectCardTagDisplayState,
  selectCardTagsState,
  selectDeckCardTagsState,
  type TagItem,
} from "@/store/selectors/card-tags";
import { useToast } from "../ui/toast.hooks";

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
  const run = useCardTagAction();

  const onToggleFavorite = () => {
    run(() => persist(() => toggleFavorite(cardCode)));
  };

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
  const run = useCardTagAction();

  const onRenameTag = (name: string, nextName: string) =>
    run(() => persist(() => renameCardTag(name, nextName)));

  const onDeleteTag = (name: string) =>
    run(() => persist(() => deleteCardTag(name)));

  const onTagsChange = (nextItems: TagItem[]) => {
    const nextTagNames = nextItems.map((item) => item.tag);

    run(() => persist(() => setCardTagsForCard(cardCode, nextTagNames)));
  };

  const onCreateTag = (name: string) => {
    run(() => persist(() => createCardTagForCard(cardCode, name)));
  };

  return {
    onCreateTag,
    onDeleteTag,
    onRenameTag,
    onTagsChange,
    selectedItems,
    tagOptions,
  };
}

export function useDeckCardTags(cardCode: string, deck: ResolvedDeck) {
  const createCardTag = useStore((state) => state.createCardTag);
  const updateDeckCardTags = useStore((state) => state.updateDeckCardTags);
  const persist = usePersistCardTags();
  const { selectedItems, tagOptions } = useStore((state) =>
    selectDeckCardTagsState(state, cardCode, deck),
  );
  const run = useCardTagAction();

  const onTagsChange = (nextItems: TagItem[]) => {
    run(() =>
      updateDeckCardTags(
        deck.id,
        cardCode,
        nextItems.map((item) => item.tag),
      ),
    );
  };

  const onCreateTag = (name: string) => {
    run(() =>
      persist(async () => {
        const tagName = await createCardTag(name);
        updateDeckCardTags(deck.id, cardCode, [
          ...selectedItems.map((item) => item.tag),
          tagName,
        ]);
      }),
    );
  };

  return {
    onCreateTag,
    onTagsChange,
    selectedItems,
    tagOptions,
  };
}

function useCardTagAction() {
  const onError = useCardTagsError();

  return (action: () => unknown) => {
    try {
      void Promise.resolve(action()).catch(onError);
    } catch (err) {
      onError(err);
    }
  };
}

function usePersistCardTags() {
  const saveCardTags = useSaveCardTagsMutation();
  const authenticated = useStore(
    (state) => state.auth.status === "authenticated",
  );

  return async (action: () => Promise<unknown>) => {
    await action();
    if (authenticated) {
      await saveCardTags.mutateAsync(undefined);
    }
  };
}

function useCardTagsError() {
  const { t } = useTranslation();
  const toast = useToast();

  return (err: unknown) => {
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
  };
}
