import type { Attachments, Card } from "@arkham-build/shared";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { makeSortFunction } from "@/store/lib/sorting";
import type { ResolvedDeck } from "@/store/lib/types";
import {
  selectLocaleSortingCollator,
  selectMetadata,
} from "@/store/selectors/shared";
import { getCardColor } from "@/utils/card-utils";
import {
  attachmentDefinitionLimit,
  canAttach,
  getAttachedQuantity,
  getAttachmentName,
  useAttachmentsChangeHandler,
} from "../attachments/attachments.helpers";
import { LimitedCardGroup } from "../limited-card-group";
import { ListCard } from "../list-card/list-card";
import { ExternalLucideIcon } from "../ui/external-lucide-icon";

type Props = {
  card: Card;
  definition: Attachments;
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

  const { i18n, t } = useTranslation();

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
          <ExternalLucideIcon url={definition.icon} />
          {getAttachmentName(definition, i18n, t)}
        </>
      }
    />
  );
}
