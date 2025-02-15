import type { ResolvedDeck } from "@/store/lib/types";
import type { Card } from "@/store/services/queries.types";
import type { AttachableDefinition } from "@/utils/constants";
import {
  LightbulbIcon,
  PackageIcon,
  StampIcon,
  StoreIcon,
  WandIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import css from "./attachments.module.css";
import { canAttach, canUpdateAttachment, getAttachedQuantity } from "./utils";
import { useAttachmentsChangeHandler } from "./utils";

type Props = {
  card: Card;
  resolvedDeck: ResolvedDeck;
  buttonVariant?: "bare";
};

export function getMatchingAttachables(card: Card, resolvedDeck: ResolvedDeck) {
  return resolvedDeck.availableAttachments.filter((definition) =>
    canAttach(card, definition),
  );
}

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
    definition: AttachableDefinition;
  },
) {
  const { buttonVariant, card, definition, resolvedDeck } = props;
  const { t } = useTranslation();

  const onChangeAttachmentQuantity = useAttachmentsChangeHandler();

  const attached = getAttachedQuantity(card, definition, resolvedDeck);

  const contentNode = (
    <span className={css["attachment-content"]}>
      <AttachmentIcon name={definition.icon} />
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

  const name = definition.name;

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

export function AttachmentIcon(props: { name: string }) {
  const { name } = props;

  if (name === "lightbulb") {
    return <LightbulbIcon />;
  }

  if (name === "store") {
    return <StoreIcon />;
  }

  if (name === "wand") {
    return <WandIcon />;
  }

  if (name === "package") {
    return <PackageIcon />;
  }

  if (name === "stamp") {
    return <StampIcon />;
  }

  return null;
}
