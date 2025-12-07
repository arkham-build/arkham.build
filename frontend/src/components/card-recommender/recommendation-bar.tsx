import type { Recommendation } from "@arkham-build/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Card } from "@/store/schemas/card.schema";
import { displayAttribute, getCardColor } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./card-recommender.module.css";

type RecommendationBarProps = {
  card: Card;
  decksAnalyzed: number;
  investigator: Card;
  isRelative: boolean;
  recommendations: Record<string, Recommendation>;
};

export function RecommendationBar(props: RecommendationBarProps) {
  const { card, decksAnalyzed, recommendations, isRelative, investigator } =
    props;

  const { t } = useTranslation();

  const recData = recommendations[card.code];
  const recommendation = recData.recommendation;
  const wholeRec = Math.round(recommendation);

  const cssVariables = useMemo(
    () =>
      ({
        "--width": `${Math.max(0, recommendation)}%`,
      }) as React.CSSProperties,
    [recommendation],
  );

  return (
    <div className={cx(css["recommendation-bar-container"])}>
      <DefaultTooltip
        tooltip={
          isRelative
            ? t("deck_edit.recommendations.tooltip_relative", {
                investigator: displayAttribute(investigator, "name"),
                name: displayAttribute(card, "name"),
                percentile: wholeRec,
              })
            : t("deck_edit.recommendations.tooltip_absolute", {
                investigator: displayAttribute(investigator, "name"),
                decksPercentage: wholeRec,
                decksAnalyzed,
                decksMatched: recData.decks_matched ?? 0,
                name: displayAttribute(card, "name"),
              })
        }
        options={{ placement: "bottom" }}
      >
        <div
          className={cx(css["recommendation-bar"], getCardColor(card))}
          style={cssVariables}
        >
          <span className={css["recommendation-bar-label"]}>{wholeRec}%</span>
        </div>
      </DefaultTooltip>
    </div>
  );
}
