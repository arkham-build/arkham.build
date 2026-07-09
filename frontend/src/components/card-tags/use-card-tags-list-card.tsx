import type { Card } from "@arkham-build/shared";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { CardTagList } from "./card-tag-list";
import { useCardTagDisplay } from "./use-card-tags";

type Options = {
  respectCardTagSetting?: boolean;
  respectFavoriteHighlightSetting?: boolean;
};

export function useCardTagsListCard(
  card: Card,
  deck: ResolvedDeck | undefined,
  options?: Options,
) {
  const showCardTags = useStore((state) => state.settings.cardShowTags ?? true);

  const showFavoriteHighlights = useStore(
    (state) => state.settings.cardShowFavoriteHighlights ?? true,
  );

  const { isFavorite, selectedItems } = useCardTagDisplay(card.code, deck);

  const visibleTags =
    showCardTags || options?.respectCardTagSetting === false
      ? selectedItems
      : [];

  const highlightFavorite =
    isFavorite &&
    (showFavoriteHighlights ||
      options?.respectFavoriteHighlightSetting === false);

  return {
    isFavorite: highlightFavorite,
    renderCardTags: visibleTags.length
      ? (card: Card) => <CardTagList card={card} items={visibleTags} />
      : undefined,
  };
}
