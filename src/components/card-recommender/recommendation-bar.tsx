import { useMemo } from "react";
import type { Card, Recommendation } from "@/store/services/queries.types";
import { getCardColor } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./card-recommender.module.css";

type RecommendationBarProps = {
  card: Card;
  recommendations: Record<string, Recommendation>;
  investigator: string;
  deckCount: number;
};

export function RecommendationBar(props: RecommendationBarProps) {
  const recData = props.recommendations[props.card.code];
  const recommendation = recData.recommendation;
  const wholeRec = Math.floor(recommendation);

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
        tooltip={recData.explanation}
        options={{ placement: "bottom" }}
      >
        <div
          className={cx(css["recommendation-bar"], getCardColor(props.card))}
          style={cssVariables}
        >
          <span className={css["recommendation-bar-label"]}>{wholeRec}%</span>
        </div>
      </DefaultTooltip>
    </div>
  );
}
