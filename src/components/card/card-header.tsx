import type { Card } from "@/store/services/queries.types";
import { getCardColor } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { CardIcon } from "../card-icon";
import { MulticlassIcons } from "../icons/multiclass-icons";
import { CardNames } from "./card-names";
import css from "./card.module.css";

type Props = {
  card: Card;
  className?: string;
  slotHeaderActions?: React.ReactNode;
  titleLinks?: "card" | "card-modal" | "dialog";
};

export function CardHeader(props: Props) {
  const { card, className, slotHeaderActions, titleLinks } = props;
  const colorCls = getCardColor(card, "background");

  return (
    <header className={cx(css["header"], colorCls, className)}>
      <div className={css["header-row"]}>
        <CardIcon card={card} className={css["header-icon"]} inverted />
        <CardNames card={card} titleLinks={titleLinks} />
      </div>
      <div className={css["header-row"]}>
        {!!slotHeaderActions && (
          <div className={css["header-actions"]}>{slotHeaderActions}</div>
        )}
        {card.type_code !== "investigator" && !card.subtype_code && (
          <MulticlassIcons
            card={card}
            className={cx(css["header-icon"], css["faction-icons"])}
            inverted
          />
        )}
      </div>
    </header>
  );
}
