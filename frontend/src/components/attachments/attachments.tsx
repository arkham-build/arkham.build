import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ResolvedDeck } from "@/store/lib/types";
import type {
  Card,
  Attachments as IAttachments,
} from "@/store/schemas/card.schema";
import { Button } from "../ui/button";
import { ExternalLucideIcon } from "../ui/external-lucide-icon";
import {
  canUpdateAttachment,
  getAttachedQuantity,
  getAttachmentName,
  getMatchingAttachables,
  useAttachmentsChangeHandler,
} from "./attachments.helpers";
import css from "./attachments.module.css";

type Props = {
  card: Card;
  resolvedDeck: ResolvedDeck;
  buttonVariant?: "bare";
};

export function Attachments(props: Props) {
  const { buttonVariant, card, resolvedDeck } = props;

  const matches = useMemo(
    () => getMatchingAttachables(card, resolvedDeck),
    [resolvedDeck, card],
  );

  if (!matches.length) return null;

  return (
    <ul className={css["attachments"]}>
      {matches.map((definition) => {
        return (
          <Attachment
            buttonVariant={buttonVariant}
            card={card}
            definition={definition}
            resolvedDeck={resolvedDeck}
            key={definition.code}
          />
        );
      })}
    </ul>
  );
}

function Attachment(
  props: Props & {
    definition: IAttachments;
  },
) {
  const { buttonVariant, card, definition, resolvedDeck } = props;
  const { i18n, t } = useTranslation();

  const onChangeAttachmentQuantity = useAttachmentsChangeHandler();

  const attached = getAttachedQuantity(card, definition, resolvedDeck);

  const contentNode = (
    <span className={css["attachment-content"]}>
      <ExternalLucideIcon url={definition.icon} />
      {!!attached && (
        <span className={css["attachment-quantity"]}>×{attached}</span>
      )}
    </span>
  );

  const canEdit =
    !!onChangeAttachmentQuantity &&
    canUpdateAttachment(card, definition, resolvedDeck);

  const onChangeQuantity = (delta: number) => {
    return onChangeAttachmentQuantity?.(definition, card, delta);
  };

  const onClick = () => {
    onChangeQuantity(1);
  };

  const onRightClick = (evt: React.MouseEvent) => {
    evt.preventDefault();
    onChangeQuantity(-1);
  };

  const name = getAttachmentName(definition, i18n, t);

  return (
    <li className={css["attachment"]} key={definition.code}>
      <Button
        iconOnly
        data-testid={`attachment-${definition.code}`}
        onClick={canEdit ? onClick : undefined}
        onContextMenu={canEdit ? onRightClick : undefined}
        size={buttonVariant ? "none" : "sm"}
        variant={buttonVariant ?? (!attached ? "bare" : undefined)}
        tooltip={
          canEdit
            ? t("attachments.attach", { name })
            : attached > 0
              ? t("attachments.attached", { name })
              : t("attachments.eligible", { name })
        }
      >
        {contentNode}
      </Button>
    </li>
  );
}
