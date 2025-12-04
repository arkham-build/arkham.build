import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ResolvedCard } from "@/store/lib/types";
import type { Card as CardType } from "@/store/schemas/card.schema";
import { displayAttribute, sideways } from "@/utils/card-utils";
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
  size: "compact" | "tooltip" | "full";
}

export function CardBack(props: Props) {
  const { className, card, size, ...rest } = props;

  const { t } = useTranslation();

  // simple backsides only contain a subset of fields.
  const backCard: CardType = useMemo(() => {
    const { clues: _, doom: __, shroud: ___, ...attributes } = card;

    const nameFallback = t("common.card_back", {
      name: displayAttribute(card, "name"),
    });

    return {
      ...attributes,
      name: displayAttribute(card, "back_name") || nameFallback,
      real_name: card.real_back_name || nameFallback,
      subname: displayAttribute(card, "back_subname"),
      real_subname: card.real_back_subname,
      flavor: displayAttribute(card, "back_flavor"),
      real_flavor: card.real_back_flavor,
      illustrator: card.back_illustrator,
      text: displayAttribute(card, "back_text"),
      real_text: card.real_back_text,
      traits:
        displayAttribute(card, "back_traits") ||
        displayAttribute(card, "traits"),
      real_traits: card.real_back_traits || card.real_traits,
    };
  }, [card, t]);

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
            <CardScan card={card} suffix="b" onFlip={onFlip} />
          </div>
        ) : (
          <div className={css["image"]}>
            <CardThumbnail card={backCard} suffix="b" />
          </div>
        ))}
    </article>
  );
}
