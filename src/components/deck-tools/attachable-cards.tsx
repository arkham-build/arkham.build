import { useStore } from "@/store";
import { makeSortFunction } from "@/store/lib/sorting";
import type { ResolvedDeck } from "@/store/lib/types";
import {
  selectLocaleSortingCollator,
  selectMetadata,
} from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import { getCardColor } from "@/utils/card-utils";
import type { AttachableDefinition } from "@/utils/constants";
import { useCallback, useMemo } from "react";
import { AttachmentIcon } from "../attachments/attachments";
import {
  attachmentDefinitionLimit,
  canAttach,
  getAttachedQuantity,
  useAttachmentsChangeHandler,
} from "../attachments/attachments.helpers";
import { LimitedCardGroup } from "../limited-card-group";
import { ListCard } from "../list-card/list-card";

type Props = {
  card: Card;
  definition: AttachableDefinition;
  readonly?: boolean;
  resolvedDeck: ResolvedDeck;
};

type Entry = {
  card: Card;
  quantity: number;
  limit: number;
};

export function AttachableCards(props: Props) {
  const { card, definition, readonly, resolvedDeck } = props;

  const metadata = useStore(selectMetadata);
  const collator = useStore(selectLocaleSortingCollator);

  const sortFunction = useMemo(
    () => makeSortFunction(["type", "name"], metadata, collator),
    [metadata, collator],
  );

  const onAttachmentQuantityChange = useAttachmentsChangeHandler();

  const onQuantityChange = useCallback(
    (card: Card, quantity: number) => {
      onAttachmentQuantityChange?.(definition, card, quantity);
    },
    [onAttachmentQuantityChange, definition],
  );

  const total = Object.values({
    ...resolvedDeck.attachments?.[definition.code],
    ...definition.requiredCards,
  }).reduce((sum, count) => sum + count, 0);

  const cards = useMemo(
    () =>
      Object.values(resolvedDeck.cards.slots)
        .reduce<Entry[]>((acc, curr) => {
          const quantity = getAttachedQuantity(
            curr.card,
            definition,
            resolvedDeck,
          );

          if (quantity === 0 && readonly) return acc;

          if (canAttach(curr.card, definition)) {
            acc.push({
              card: curr.card,
              quantity,
              limit: resolvedDeck.slots[curr.card.code] ?? 0,
            });
          }

          return acc;
        }, [])
        .sort((a, b) => sortFunction(a.card, b.card)),
    [resolvedDeck, definition, sortFunction, readonly],
  );

  const colorCls = getCardColor(card, "background");

  return (
    <LimitedCardGroup
      className={colorCls}
      count={{
        limit: definition.targetSize,
        total,
      }}
      entries={cards}
      renderCard={(entry) => (
        <ListCard
          annotation={resolvedDeck.annotations[entry.card.code]}
          as="li"
          key={entry.card.code}
          card={entry.card}
          quantity={entry.quantity}
          limitOverride={attachmentDefinitionLimit(
            entry.card,
            entry.limit ?? 0,
            definition.limit,
          )}
          onChangeCardQuantity={!readonly ? onQuantityChange : undefined}
        />
      )}
      title={
        <>
          <AttachmentIcon name={definition.icon} />
          {definition.name}
        </>
      }
    />
  );
}
