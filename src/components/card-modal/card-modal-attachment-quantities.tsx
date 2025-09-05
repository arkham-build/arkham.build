import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Attachments, Card } from "@/store/schemas/card.schema";
import {
  attachmentDefinitionLimit,
  canAttach,
  canUpdateAttachment,
  getAttachedQuantity,
  getAttachmentName,
  useAttachmentsChangeHandler,
} from "../attachments/attachments.helpers";
import { ExternalLucideIcon } from "../ui/external-lucide-icon";
import { QuantityInput } from "../ui/quantity-input";
import css from "./card-modal.module.css";

type Props = {
  card: Card;
  resolvedDeck: ResolvedDeck;
};

export function CardModalAttachmentQuantities(props: Props) {
  const { card, resolvedDeck } = props;

  if (!resolvedDeck.availableAttachments.length) return null;

  return (
    <>
      {resolvedDeck.availableAttachments.map((definition) => (
        <AttachmentQuantity
          card={card}
          definition={definition}
          key={definition.code}
          resolvedDeck={resolvedDeck}
        />
      ))}
    </>
  );
}

function AttachmentQuantity(
  props: Props & {
    card: Card;
    resolvedDeck: ResolvedDeck;
    definition: Attachments;
  },
) {
  const { card, definition, resolvedDeck } = props;

  const { i18n, t } = useTranslation();

  const onAttachmentChange = useAttachmentsChangeHandler();

  const onValueChange = useCallback(
    (value: number) => onAttachmentChange?.(definition, card, value),
    [onAttachmentChange, definition, card],
  );

  if (!canAttach(card, definition)) return null;

  const attached = getAttachedQuantity(card, definition, resolvedDeck);

  return (
    <article className={css["quantity"]} key={definition.code}>
      <h3 className={css["quantity-title"]}>
        <ExternalLucideIcon url={definition.icon} />{" "}
        {getAttachmentName(definition, i18n, t)}
      </h3>
      <QuantityInput
        data-testid={`card-modal-quantities-${definition.code}`}
        disabled={!canUpdateAttachment(card, definition, resolvedDeck)}
        limit={attachmentDefinitionLimit(
          card,
          resolvedDeck.slots[card.code] ?? 0,
          definition.limit,
        )}
        onValueChange={onValueChange}
        value={attached}
      />
    </article>
  );
}
