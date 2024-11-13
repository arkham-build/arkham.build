import { useStore } from "@/store";
import { makeSortFunction } from "@/store/lib/sorting";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Card } from "@/store/services/queries.types";
import { getCardColor } from "@/utils/card-utils";
import type { AttachableDefinition } from "@/utils/constants";
import { useCallback, useMemo } from "react";
import { AttachmentIcon } from "../attachments/attachments";
import {
  attachmentDefinitionLimit,
  canAttach,
  canUpdateAttachment,
  getAttachedQuantity,
} from "../attachments/utils";
import { useAttachmentsChangeHandler } from "../attachments/utils";
import { LimitedCardGroup } from "../limited-card-group";
import { ListCard } from "../list-card/list-card";

type Props = {
  card: Card;
  definition: AttachableDefinition;
  resolvedDeck: ResolvedDeck;
};

type Entry = {
  card: Card;
  quantity: number;
  limit: number;
};

export function AttachableCards(props: Props) {
  const { card, definition, resolvedDeck } = props;

  const metadata = useStore((state) => state.metadata);

  const sortFunction = useMemo(
    () => makeSortFunction(["type", "name"], metadata),
    [metadata],
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
          if (canAttach(curr.card, definition)) {
            acc.push({
              card: curr.card,
              quantity: getAttachedQuantity(
                curr.card,
                definition,
                resolvedDeck,
              ),
              limit: resolvedDeck.slots[curr.card.code] ?? 0,
            });
          }

          return acc;
        }, [])
        .sort((a, b) => sortFunction(a.card, b.card)),
    [resolvedDeck, definition, sortFunction],
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
          as="li"
          key={entry.card.code}
          card={entry.card}
          quantity={entry.quantity}
          limitOverride={attachmentDefinitionLimit(
            entry.card,
            entry.limit ?? 0,
            definition.limit,
          )}
          onChangeCardQuantity={
            canUpdateAttachment(entry.card, definition, resolvedDeck)
              ? onQuantityChange
              : undefined
          }
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
