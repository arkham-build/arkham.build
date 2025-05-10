import type { Card } from "@/store/services/queries.types";
import { cardLimit } from "@/utils/card-utils";
import { TabooIndicator } from "../taboo-indicator";
import { QuantityInput } from "../ui/quantity-input";
import { QuantityOutput } from "../ui/quantity-output";
import css from "./card-actions.module.css";
import type { CardListItemProps } from "./types";

interface Props extends Pick<CardListItemProps, "listCardProps"> {
  card: Card;
  quantity?: number;
}

export function CardActions(props: Props) {
  const { card, listCardProps, quantity } = props;

  const onChangeCardQuantity = listCardProps?.onChangeCardQuantity;

  if (quantity == null) return null;

  return (
    <div className={css["actions"]}>
      <div className={css["actions-row"]}>
        {onChangeCardQuantity ? (
          <QuantityInput
            className={css["actions-quantity"]}
            limit={cardLimit(card, listCardProps?.limitOverride)}
            limitOverride={listCardProps?.limitOverride}
            value={quantity}
            onValueChange={(quantity, limit) =>
              listCardProps?.onChangeCardQuantity?.(card, quantity, limit)
            }
          />
        ) : (
          <QuantityOutput value={quantity || 0} />
        )}
        <TabooIndicator card={card} />
        {listCardProps?.renderCardExtra?.(card, quantity)}
      </div>
    </div>
  );
}
