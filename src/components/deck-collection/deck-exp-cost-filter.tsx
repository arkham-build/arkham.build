import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectDeckFilterValue,
  selectDecksMinMaxExpCost,
  selectExpCostChanges,
} from "@/store/selectors/deck-collection";
import { FilterContainer } from "../filters/primitives/filter-container";
import { RangeSelect } from "../ui/range-select";

type Props = {
  containerClass?: string;
};

export function DeckXPCostFilter({ containerClass }: Props) {
  const { t } = useTranslation();

  const changes = useStore(selectExpCostChanges);
  const [min, max] = useStore(selectDecksMinMaxExpCost);

  const value = useStore((state) => selectDeckFilterValue(state, "expCost"));
  const open = useStore((state) => state.deckCollection.open.expCost);

  const setFilterOpen = useStore((state) => state.setDeckFilterOpen);
  const resetFilter = useStore((state) => state.resetDeckFilter);
  const setFilterValue = useStore((state) => state.addDecksFilter);

  const onReset = useCallback(() => {
    resetFilter("expCost");
  }, [resetFilter]);

  const onOpenChange = useCallback(
    (val: boolean) => {
      setFilterOpen("expCost", val);
    },
    [setFilterOpen],
  );

  const onValueCommit = useCallback(
    (value: [number, number]) => {
      setFilterValue("expCost", value);
    },
    [setFilterValue],
  );

  return (
    min !== max && (
      <FilterContainer
        changes={changes}
        className={containerClass}
        onOpenChange={onOpenChange}
        onReset={onReset}
        open={open}
        title={t("deck.stats.xp_required")}
      >
        <RangeSelect
          data-testid="filters-cost-range"
          id="cost-select"
          label={t("common.xp", { count: 2 })}
          max={max}
          min={min}
          onValueCommit={onValueCommit}
          value={value ?? [min, max]}
        />
      </FilterContainer>
    )
  );
}
