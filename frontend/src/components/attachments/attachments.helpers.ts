import type { Attachments, Card } from "@arkham-build/shared";
import type { i18n, TFunction } from "i18next";
import { useCallback } from "react";
import { useStore } from "@/store";
import { filterAttribute } from "@/store/lib/filtering";
import type { ResolvedDeck } from "@/store/lib/types";
import { cardLimit } from "@/utils/card-utils";
import { useResolvedDeckChecked } from "@/utils/use-resolved-deck";

export function canAttach(card: Card, definition: Attachments) {
  return (
    definition.code !== card.code &&
    definition.traits?.some((t) => card.real_traits?.includes(t)) &&
    (definition.filters?.every((attributeFilter) =>
      filterAttribute(attributeFilter)(card),
    ) ??
      true)
  );
}

function attachmentLimit(card: Card, quantityInDeck: number) {
  return Math.min(quantityInDeck, cardLimit(card));
}

export function attachmentDefinitionLimit(
  card: Card,
  quantityInDeck: number,
  attachmentDefinitionLimit: number | undefined | null,
) {
  return Math.min(
    attachmentLimit(card, quantityInDeck),
    attachmentDefinitionLimit ?? Number.MAX_SAFE_INTEGER,
  );
}

export function getAttachedQuantity(
  card: Card,
  definition: Attachments,
  resolvedDeck: ResolvedDeck,
) {
  return (
    definition.requiredCards?.[card.code] ??
    resolvedDeck.attachments?.[definition.code]?.[card.code] ??
    0
  );
}

export function canUpdateAttachment(
  card: Card,
  definition: Attachments,
  resolvedDeck: ResolvedDeck,
) {
  return (
    definition.requiredCards?.[card.code] == null &&
    resolvedDeck.slots[card.code] > 0
  );
}

export function useAttachmentsChangeHandler() {
  const { canEdit, resolvedDeck } = useResolvedDeckChecked();

  const updateAttachment = useStore((state) => state.updateAttachment);

  const changeHandler = useCallback(
    (definition: Attachments, card: Card, delta: number) => {
      const quantity = resolvedDeck.slots[card.code] ?? 0;

      const attached =
        resolvedDeck.attachments?.[definition.code]?.[card.code] ?? 0;
      const limit = attachmentDefinitionLimit(card, quantity, definition.limit);

      const nextQuantity = attached + delta;

      return updateAttachment({
        deck: resolvedDeck,
        targetCode: definition.code,
        code: card.code,
        quantity: nextQuantity > limit ? 0 : nextQuantity,
        limit: attachmentLimit(card, quantity),
      });
    },
    [resolvedDeck, updateAttachment],
  );

  return canEdit ? changeHandler : undefined;
}

export function getMatchingAttachables(card: Card, resolvedDeck: ResolvedDeck) {
  return resolvedDeck.availableAttachments.filter((definition) =>
    canAttach(card, definition),
  );
}

export function getAttachmentName(
  definition: Attachments,
  i18n: i18n,
  t: TFunction,
) {
  const nameKey = `deck.attachments.${definition.name}`;
  const name = i18n.exists(nameKey) ? t(nameKey) : definition.name;
  return name;
}
