import type { Card } from "@arkham-build/shared";
import { CircleHelpIcon } from "lucide-react";
import { useStore } from "@/store";
import type { CardSet as CardSetType } from "@/store/lib/types";
import {
  selectCanCheckOwnership,
  selectCardOwnedCount,
} from "@/store/selectors/shared";
import { ListCard } from "./list-card/list-card";
import { OwnershipPartitionedCardList } from "./ownership-partitioned-card-list";
import { RelatedCardContainer } from "./related-card-container";
import { DefaultTooltip } from "./ui/tooltip";

type Props = {
  className?: string;
  onChangeCardQuantity?: (card: Card, quantity: number) => void;
  onSelect?: (id: string) => void;
  set: CardSetType;
};

export function CardSet(props: Props) {
  const { className, onChangeCardQuantity, onSelect, set } = props;
  const canCheckOwnership = useStore(selectCanCheckOwnership);
  const cardOwnedCount = useStore(selectCardOwnedCount);

  return (
    <RelatedCardContainer
      actions={
        set.help && (
          <DefaultTooltip
            tooltip={
              <div
                className="longform"
                // oxlint-disable-next-line react/no-danger -- HTML is produced by us.
                dangerouslySetInnerHTML={{ __html: set.help }}
              />
            }
          >
            <CircleHelpIcon />
          </DefaultTooltip>
        )
      }
      className={className}
      selected={set.selected}
      selection={
        onSelect
          ? {
              checked: set.selected,
              disabled: !onSelect || !set.canSelect,
              id: `card-set-${set.id}`,
              onChange: () => onSelect?.(set.id),
            }
          : undefined
      }
      testId={`cardset-${set.id}`}
      title={set.title}
    >
      <ul>
        <OwnershipPartitionedCardList
          cards={set.cards}
          cardRenderer={({ card }) => (
            <ListCard
              as="li"
              card={card}
              key={card.code}
              omitBorders
              onChangeCardQuantity={
                set.canSetQuantity ? onChangeCardQuantity : undefined
              }
              ownedCount={canCheckOwnership ? cardOwnedCount(card) : undefined}
              quantity={set.quantities?.[card.code]}
            />
          )}
        />
      </ul>
    </RelatedCardContainer>
  );
}
