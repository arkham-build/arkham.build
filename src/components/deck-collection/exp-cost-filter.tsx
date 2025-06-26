// Currently unused, functionality preserved for 'My Decks' dedicated page.

import { useCallback } from "react";
import { useStore } from "@/store";
import {
  selectDeckFilterValue,
  selectDecksMinMaxExpCost,
  selectExpCostChanges,
} from "@/store/selectors/deck-filters";
import { FilterContainer } from "../filters/primitives/filter-container";
import { RangeSelect } from "../ui/range-select";

type Props = {
  containerClass?: string;
};

export function ExpCostFilters({ containerClass }: Props) {
  const changes = useStore(selectExpCostChanges);
  const [min, max] = useStore(selectDecksMinMaxExpCost);

  const value = useStore((state) => selectDeckFilterValue(state, "expCost"));
  const open = useStore((state) => state.deckFilters.open.expCost);

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
        title="Experience cost"
      >
        <RangeSelect
          data-testid="filters-cost-range"
          id="cost-select"
          label="Cost"
          max={max}
          min={min}
          onValueCommit={onValueCommit}
          value={value ?? [min, max]}
        />
      </FilterContainer>
    )
  );
}
