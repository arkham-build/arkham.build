import { useMemo, useState } from "react";
import type { ResolvedCard } from "@/store/lib/types";
import type { Card as CardType } from "@/store/services/queries.types";
import { displayAttribute, sideways } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { CardScan } from "../card-scan";
import { CardThumbnail } from "../card-thumbnail";
import css from "./card.module.css";
import { CardHeader } from "./card-header";
import { CardMetaBack } from "./card-meta";
import { CardText } from "./card-text";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  card: ResolvedCard["card"];
  size: "compact" | "tooltip" | "full";
}

export function CardBack(props: Props) {
  const { className, card, size, ...rest } = props;

  const backCard: CardType = useMemo(
    () => ({
      ...card,
      real_name:
        displayAttribute(card, "back_name") ||
        `${displayAttribute(card, "name")} - Back`,
      real_subname: undefined,
      real_flavor: displayAttribute(card, "back_flavor"),
      illustrator: card.back_illustrator,
      real_text: displayAttribute(card, "back_text"),
    }),
    [card],
  );

  const [isSideways, setSideways] = useState(sideways(card));
  const hasHeader = card.parallel || card.type_code !== "investigator";

  const showImage =
    size === "full" ||
    (backCard.type_code !== "investigator" && backCard.type_code !== "story");

  const showMeta =
    size === "full" &&
    backCard.illustrator &&
    backCard.illustrator !== card.illustrator;

  return (
    <article
      className={cx(
        css["card"],
        isSideways && css["sideways"],
        css["back"],
        hasHeader && css["back-has-header"],
        showImage && css["has-image"],
        css[size],
        className,
      )}
      data-testid="card-back"
      {...rest}
    >
      {hasHeader && <CardHeader card={backCard} />}

      <div className={css["content"]}>
        <CardText
          flavor={displayAttribute(card, "back_flavor")}
          size={size}
          text={displayAttribute(card, "back_text")}
          typeCode={card.type_code}
        />
        {showMeta && <CardMetaBack illustrator={backCard.illustrator} />}
      </div>

      {showImage &&
        (size === "full" ? (
          <div className={css["image"]}>
            <CardScan card={card} suffix="b" onFlip={setSideways} />
          </div>
        ) : (
          <div className={css["image"]}>
            <CardThumbnail card={backCard} suffix="b" />
          </div>
        ))}
    </article>
  );
}
