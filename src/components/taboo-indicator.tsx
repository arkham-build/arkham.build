import type { Card } from "@/store/services/queries.types";
import { cx } from "@/utils/cx";
import { ExperienceDots } from "./experience-dots";
import css from "./taboo-indicator.module.css";

type Props = {
  card: Card;
  className?: string;
  cardLevelDisplay?: "text" | "dots" | "icon-only";
};

export function TabooIndicator(props: Props) {
  const { card, cardLevelDisplay, className } = props;

  if (!card.taboo_set_id) return null;

  return (
    <span className={cx(className, css["indicator"], "color-taboo")}>
      <i className="icon-tablet icon-layout color-taboo" />
      {cardLevelDisplay &&
        card.taboo_xp &&
        (cardLevelDisplay === "text" ? (
          <strong>{signedInteger(card.taboo_xp)} XP</strong>
        ) : (
          <ExperienceDots xp={card.taboo_xp} />
        ))}
    </span>
  );
}

function signedInteger(num: number) {
  return num > 0 ? `+${num}` : num.toString();
}
