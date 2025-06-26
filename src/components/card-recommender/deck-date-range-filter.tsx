import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  deckDateTickRange,
  deckTickToString,
} from "@/store/slices/recommender";
import { cx } from "@/utils/cx";
import { RangeSelect } from "../ui/range-select";
import css from "./card-recommender.module.css";

export function DeckDateRangeFilter() {
  const { t } = useTranslation();
  const value = useStore((state) => state.recommender.deckFilter);
  const setFilterValue = useStore((state) => state.setRecommenderDeckFilter);

  const onValueCommit = useCallback(
    (value: [number, number]) => {
      setFilterValue(value);
    },
    [setFilterValue],
  );

  const [min, max] = deckDateTickRange();

  return (
    <RangeSelect
      className={cx(css["date-range-selector"])}
      data-testid="deck-date-range"
      id="deck-date-range-select"
      label={t("deck_edit.recommendations.publication_date")}
      max={max}
      min={min}
      onValueChange={onValueCommit}
      onValueCommit={onValueCommit}
      value={value}
      outputClassName={cx(css["date-range-output"])}
      renderLabel={deckTickToString}
      showLabel
    />
  );
}
