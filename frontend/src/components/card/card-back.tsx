import type { Card as CardType } from "@arkham-build/shared";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ResolvedCard } from "@/store/lib/types";
import {
  displayAttribute,
  doubleSidedBackCard,
  sideways,
} from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { CardScan } from "../card-scan";
import { CardThumbnail } from "../card-thumbnail";
import css from "./card.module.css";
import { CardDetails } from "./card-details";
import { CardHeader } from "./card-header";
import { CardMetaBack } from "./card-meta";
import { CardText } from "./card-text";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  card: ResolvedCard["card"];
  ignoreTaboo?: boolean;
  size: "compact" | "tooltip" | "full";
}

export function CardBack(props: Props) {
  const { className, card, ignoreTaboo, size, ...rest } = props;

  const { t } = useTranslation();

  // simple backsides only contain a subset of fields.
  const backCard: CardType = useMemo(
    () => doubleSidedBackCard(card, t) as CardType,
    [card, t],
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

  const onFlip = useCallback((_: boolean, sideways: boolean) => {
    setSideways(sideways);
  }, []);

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

      {card.type_code !== "investigator" && (
        <div className={css["pre"]}>
          <CardDetails card={backCard} face="simple-back" />
        </div>
      )}

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
            <CardScan
              card={card}
              suffix="b"
              onFlip={onFlip}
              ignoreTaboo={ignoreTaboo}
            />
          </div>
        ) : (
          <div className={css["image"]}>
            <CardThumbnail card={backCard} suffix="b" />
          </div>
        ))}
    </article>
  );
}
