import type { Card } from "@arkham-build/shared";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { CardTagList } from "./card-tag-list";
import css from "./card-tag-list.module.css";
import { useCardTagDisplay } from "./use-card-tags";

type RenderCardAfter = (card: Card, quantity?: number) => React.ReactNode;

type Options = {
  respectCardTagSetting?: boolean;
  respectFavoriteHighlightSetting?: boolean;
};

export function useCardTagsAfterRow(
  card: Card,
  deck: ResolvedDeck | undefined,
  renderCardAfter: RenderCardAfter | undefined,
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
    highlightFavorite,
    renderCardAfter:
      visibleTags.length || renderCardAfter
        ? (card: Card, quantity?: number) => (
            <div className={css["after-row"]}>
              <CardTagList card={card} items={visibleTags} />
              {renderCardAfter?.(card, quantity)}
            </div>
          )
        : undefined,
  };
}
