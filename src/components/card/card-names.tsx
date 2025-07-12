import { useCallback } from "react";
import { Link } from "wouter";
import { useStore } from "@/store";
import type { Card } from "@/store/schemas/card.schema";
import { displayAttribute, parseCardTitle } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { preventLeftClick } from "@/utils/prevent-links";
import { useCardModalContextChecked } from "../card-modal/card-modal-context";
import { CardName } from "../card-name";
import { UniqueIcon } from "../icons/unique-icon";
import { useDialogContext } from "../ui/dialog.hooks";
import css from "./card.module.css";

type Props = {
  card: Card;
  titleLinks?: "card" | "card-modal" | "dialog";
};

export function CardNames(props: Props) {
  const { card, titleLinks } = props;

  const cardModalContext = useCardModalContextChecked();
  const dialogContext = useDialogContext();
  const settings = useStore((state) => state.settings);

  const cardName = (
    <>
      <CardName
        invert
        className={css["name-inner"]}
        card={card}
        cardLevelDisplay={settings.cardLevelDisplay}
        cardShowCollectionNumber={settings.cardShowCollectionNumber}
      >
        {card.parallel && (
          <i className={cx(css["parallel"], "icon-parallel")} />
        )}
        {card.is_unique && (
          <span className={css["unique"]}>
            {card.is_unique && <UniqueIcon />}
          </span>
        )}
      </CardName>
    </>
  );

  const hasModal =
    (titleLinks === "card-modal" && cardModalContext) ||
    (titleLinks === "dialog" && dialogContext);

  const onCardTitleClick = useCallback(
    (evt: React.MouseEvent<HTMLAnchorElement>) => {
      const linkPrevented = preventLeftClick(evt);
      if (linkPrevented) {
        if (titleLinks === "card-modal") {
          cardModalContext.setOpen({ code: card.code });
        } else if (dialogContext) {
          dialogContext.setOpen(true);
        }
      }
    },
    [card.code, cardModalContext, dialogContext, titleLinks],
  );

  return (
    <div className={css["name-row"]}>
      <h1 className={css["name"]} data-testid="card-name">
        {titleLinks === "card" && (
          <Link href={`/card/${card.code}`}>{cardName}</Link>
        )}
        {hasModal && (
          <Link href={`~/card/${card.code}`} onClick={onCardTitleClick}>
            {cardName}
          </Link>
        )}
        {!titleLinks && cardName}
      </h1>
      {card.real_subname && (
        <h2
          className={css["sub"]}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: safe and necessary.
          dangerouslySetInnerHTML={{
            __html: parseCardTitle(displayAttribute(card, "subname")),
          }}
        />
      )}
    </div>
  );
}
