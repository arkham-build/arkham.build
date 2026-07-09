import type { Card } from "@arkham-build/shared";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectResolvedCardById } from "@/store/selectors/lists";
import type { ViewMode } from "@/store/slices/lists.types";
import { cx } from "@/utils/cx";
import { useAccentColor } from "@/utils/use-accent-color";
import { Card as CardComponent } from "../card/card";
import { useCardTagsListCard } from "../card-tags/use-card-tags-list-card";
import { ListCard } from "../list-card/list-card";
import { CardActions } from "./card-actions";
import css from "./card-list-items.module.css";
import type { CardListItemProps } from "./types";

interface Props extends CardListItemProps {
  card: Card;
  currentTop: number;
  index: number;
  quantity?: number;
  resolvedDeck?: ResolvedDeck;
  viewMode: ViewMode;
}

export function CardListItemCompact(props: Props) {
  const {
    card,
    currentTop,
    index,
    listCardProps,
    quantity,
    resolvedDeck,
    viewMode,
  } = props;

  const {
    className,
    renderCardAfter,
    renderCardTags: renderCardTagsProp,
    style,
    ...restListCardProps
  } = listCardProps ?? {};
  const { isFavorite, renderCardTags } = useCardTagsListCard(
    card,
    resolvedDeck,
  );
  const accentColor = useAccentColor(card);

  return (
    <ListCard
      {...restListCardProps}
      annotation={resolvedDeck?.annotations[card.code]}
      card={card}
      className={cx(className, isFavorite && css["favorite"])}
      disableKeyboard
      highlightQuantity
      isActive={index === currentTop}
      key={card.code}
      quantity={quantity}
      renderCardAfter={renderCardAfter}
      renderCardTags={renderCardTags ?? renderCardTagsProp}
      showCardText={viewMode === "card-text"}
      style={isFavorite ? { ...style, ...accentColor } : style}
    />
  );
}

export function CardListItemFull(props: Props) {
  const { card, resolvedDeck, ...rest } = props;

  const resolvedCard = useStore((state) =>
    selectResolvedCardById(state, card.code, resolvedDeck),
  );

  if (!resolvedCard) return null;

  return (
    <div className={css["card-list-item-full"]}>
      <CardComponent
        key={card.code}
        slotHeaderActions={<CardActions {...rest} card={card} />}
        resolvedCard={resolvedCard}
        size="full"
        titleLinks="card-modal"
      />
    </div>
  );
}
