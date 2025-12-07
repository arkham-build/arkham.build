import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  costToString,
  selectActiveListFilter,
  selectCostMinMax,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { isCostFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { Checkbox } from "../ui/checkbox";
import { CheckboxGroup } from "../ui/checkboxgroup";
import { RangeSelect } from "../ui/range-select";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilterCallbacks } from "./primitives/filter-hooks";

export function CostFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();
  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isCostFilterObject(filter),
    `CostFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const { min, max } = useStore((state) =>
    selectCostMinMax(state, resolvedDeck, targetDeck),
  );

  const { onReset, onChange, onOpenChange } = useFilterCallbacks(id);

  const onValueCommit = useCallback(
    (val: number[]) => {
      onChange({
        range: [val[0], val[1]],
      });
    },
    [onChange],
  );

  const onSetEven = useCallback(
    (val: boolean | string) => {
      onChange({
        even: !!val,
      });
    },
    [onChange],
  );

  const onSetOdd = useCallback(
    (val: boolean | string) => {
      onChange({
        odd: !!val,
      });
    },
    [onChange],
  );

  const onSetX = useCallback(
    (val: boolean | string) => {
      onChange({
        x: !!val,
      });
    },
    [onChange],
  );

  const onToggleOpen = useCallback(
    (val: boolean) => {
      if (val && !filter.value.range) {
        onChange({
          range: [-1, max],
        });
      }
      onOpenChange(val);
    },
    [max, filter.value.range, onOpenChange, onChange],
  );

  const rangeValue = useMemo(
    () => (filter.value.range as [number, number]) ?? [min, max],
    [filter.value.range, min, max],
  );

  return (
    <FilterContainer
      changes={changes}
      data-testid="filters-cost"
      onOpenChange={onToggleOpen}
      onReset={onReset}
      open={filter.open}
      title={t("filters.cost.title")}
    >
      <RangeSelect
        data-testid="filters-cost-range"
        id="cost-select"
        label={t("filters.cost.title")}
        max={max}
        min={-1}
        onValueCommit={onValueCommit}
        renderLabel={costToString}
        value={rangeValue}
      />
      <CheckboxGroup cols={2}>
        <Checkbox
          data-testid="filters-cost-even"
          checked={filter.value.even}
          id="cost-even"
          label={t("filters.cost.even")}
          onCheckedChange={onSetEven}
        />
        <Checkbox
          data-testid="filters-cost-x"
          checked={filter.value.x}
          id="cost-x"
          label={<i className="icon-x" />}
          onCheckedChange={onSetX}
        />
        <Checkbox
          data-testid="filters-cost-odd"
          checked={filter.value.odd}
          id="cost-odd"
          label={t("filters.cost.odd")}
          onCheckedChange={onSetOdd}
        />
      </CheckboxGroup>
    </FilterContainer>
  );
}
