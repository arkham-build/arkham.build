import { DECKLIST_SEARCH_MAX_XP } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { RangeSelect } from "../ui/range-select";

type Props = {
  onValueChange: (value: [number, number]) => void;
  value?: [number, number] | undefined | null;
};

export function DecklistsXpRangeInput({ onValueChange, value }: Props) {
  const { t } = useTranslation();
  const current: [number, number] = value ?? [0, DECKLIST_SEARCH_MAX_XP];

  return (
    <RangeSelect
      id="deck-xp-range-select"
      label={t("decklists.filters.xp_range")}
      min={0}
      max={DECKLIST_SEARCH_MAX_XP}
      onValueChange={onValueChange}
      onValueCommit={onValueChange}
      renderLabel={(val) =>
        val === DECKLIST_SEARCH_MAX_XP
          ? `${DECKLIST_SEARCH_MAX_XP}+`
          : String(val)
      }
      showLabel
      value={current}
    />
  );
}
