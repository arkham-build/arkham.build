import type { Card } from "@arkham-build/shared";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { CardTagList } from "./card-tag-list";
import css from "./card-tag-list.module.css";
import { useCardTagDisplay } from "./use-card-tags";

type RenderCardAfter = (card: Card, quantity?: number) => React.ReactNode;

type Options = {
  respectCardTagSetting?: boolean;
};

export function useCardTagsAfterRow(
  card: Card,
  deck: ResolvedDeck | undefined,
  renderCardAfter: RenderCardAfter | undefined,
  options?: Options,
) {
  const showCardTags = useStore((state) => state.settings.cardShowTags ?? true);
  const { isFavorite, selectedItems } = useCardTagDisplay(card.code, deck);
  const visibleTags =
    showCardTags || options?.respectCardTagSetting === false
      ? selectedItems
      : [];

  return {
    isFavorite,
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
