import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectResolvedCardById } from "@/store/selectors/lists";
import type { Card } from "@/store/services/queries.types";
import type { ViewMode } from "@/store/slices/lists.types";
import { Card as CardComponent } from "../card/card";
import { ListCard } from "../list-card/list-card";
import { CardActions } from "./card-actions";
import css from "./card-list-items.module.css";
import type { CardListItemProps } from "./types";

type Props = CardListItemProps & {
  card: Card;
  currentTop: number;
  index: number;
  quantity?: number;
  resolvedDeck?: ResolvedDeck;
  viewMode: ViewMode;
};

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

  return (
    <ListCard
      {...listCardProps}
      annotation={resolvedDeck?.annotations[card.code]}
      card={card}
      disableKeyboard
      isActive={index === currentTop}
      key={card.code}
      quantity={quantity}
      showCardText={viewMode === "card-text"}
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
        headerActions={<CardActions {...rest} card={card} />}
        resolvedCard={resolvedCard}
        size="full"
        titleLinks="card-modal"
      />
    </div>
  );
}
