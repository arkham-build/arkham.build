import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RangeSelect } from "../ui/range-select";
import css from "./decklists-date-range-input.module.css";

type Props = {
  onValueChange: (value: [string, string]) => void;
  value?: [string, string];
};

export function DecklistsDateRangeInput(props: Props) {
  const { onValueChange, value } = props;

  const { t } = useTranslation();

  const onValueCommit = useCallback(
    (value: [number, number]) => {
      onValueChange([deckTickToString(value[0]), deckTickToString(value[1])]);
    },
    [onValueChange],
  );

  const [min, max] = deckDateTickRange();

  const transformed: [number, number] = useMemo(
    () => [
      value ? stringToDeckTick(value[0]) : min,
      value ? stringToDeckTick(value[1]) : max,
    ],
    [value, min, max],
  );

  return (
    <RangeSelect
      className={css["date-range"]}
      data-testid="deck-date-range"
      id="deck-date-range-select"
      label={t("deck_edit.recommendations.publication_date")}
      max={max}
      min={min}
      onValueChange={onValueCommit}
      onValueCommit={onValueCommit}
      outputClassName={css["date-range-output"]}
      renderLabel={deckTickToString}
      showLabel
      value={transformed}
    />
  );
}

function toStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth());
}

function deckDateRange(): [Date, Date] {
  const minDate = new Date(2016, 8);
  const maxDate = toStartOfMonth(new Date());
  return [minDate, maxDate];
}

function deckDateTickRange(): [number, number] {
  const [minDate, maxDate] = deckDateRange();
  const monthsBetween =
    (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
    maxDate.getMonth() -
    minDate.getMonth();
  return [0, monthsBetween];
}

function stringToDeckTick(dateString: string): number {
  const [year, month] = dateString.split("-").map(Number);
  const [min, _] = deckDateRange();
  const date = new Date(year, month - 1);
  return (
    (date.getFullYear() - min.getFullYear()) * 12 +
    date.getMonth() -
    min.getMonth()
  );
}

function deckTickToString(tick: number): string {
  const [min, _] = deckDateRange();
  const date = new Date(min.getFullYear(), min.getMonth() + tick);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}
