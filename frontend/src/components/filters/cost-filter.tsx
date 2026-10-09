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
import { useFilter } from "./primitives/filter-hooks";

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

  const { onReset, onChange, onOpenChange, locked } = useFilter(id);

  const onValueCommit = (val: number[]) => {
    onChange({
      range: [val[0], val[1]],
    });
  };

  const onSetEven = (val: boolean | string) => {
    onChange({
      even: !!val,
    });
  };

  const onSetOdd = (val: boolean | string) => {
    onChange({
      odd: !!val,
    });
  };

  const onSetX = (val: boolean | string) => {
    onChange({
      x: !!val,
    });
  };

  const onToggleOpen = (val: boolean) => {
    if (val && !filter.value.range) {
      onChange({
        range: [-1, max],
      });
    }
    onOpenChange(val);
  };

  const rangeValue = (filter.value.range as [number, number]) ?? [min, max];

  return (
    <FilterContainer
      changes={changes}
      data-testid="filters-cost"
      locked={locked}
      onOpenChange={onToggleOpen}
      onReset={onReset}
      open={filter.open}
      title={t("filters.cost.title")}
    >
      <RangeSelect
        disabled={locked}
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
          disabled={locked}
          data-testid="filters-cost-even"
          checked={filter.value.even}
          id="cost-even"
          label={t("filters.cost.even")}
          onCheckedChange={onSetEven}
        />
        <Checkbox
          disabled={locked}
          data-testid="filters-cost-x"
          checked={filter.value.x}
          id="cost-x"
          label={<i className="icon-x" />}
          onCheckedChange={onSetX}
        />
        <Checkbox
          disabled={locked}
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
