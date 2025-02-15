import { useStore } from "@/store";
import {
  levelToString,
  selectActiveListFilter,
  selectLevelChanges,
} from "@/store/selectors/lists";
import { isLevelFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "../ui/checkbox";
import { CheckboxGroup } from "../ui/checkboxgroup";
import { RangeSelect } from "../ui/range-select";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilterCallbacks } from "./primitives/filter-hooks";

function getToggleValue(value: [number, number] | undefined) {
  if (!value) return "";
  if (value[0] === 0 && value[1] === 0) return "0";
  if (value[0] === 1 && value[1] === 5) return "1-5";
  return "";
}

export function LevelFilter({ id }: FilterProps) {
  const { t } = useTranslation();
  const filter = useStore((state) => selectActiveListFilter(state, id));
  assert(
    isLevelFilterObject(filter),
    `LevelFilter instantiated with '${filter?.type}'`,
  );

  const changes = selectLevelChanges(filter.value);

  const { onReset, onChange, onOpenChange } = useFilterCallbacks(id);

  const onChangeRange = useCallback(
    (val: [number, number] | undefined) => {
      onChange({
        range: val,
      });
    },
    [onChange],
  );

  const onToggleOpen = useCallback(
    (val: boolean) => {
      if (val && !filter.value.range) {
        onChangeRange([0, 5]);
      }
      onOpenChange(val);
    },
    [onChangeRange, filter.value.range, onOpenChange],
  );

  const onSetExceptional = useCallback(
    (val: boolean) => {
      onChange({
        exceptional: val,
      });
    },
    [onChange],
  );

  const onSetNonexceptional = useCallback(
    (val: boolean) => {
      onChange({
        nonexceptional: val,
      });
    },
    [onChange],
  );

  const onApplyLevelShortcut = useCallback(
    (value: string) => {
      if (value === "0") {
        onChange({
          range: [0, 0],
        });
      } else if (value === "1-5") {
        onChange({
          range: [1, 5],
        });
      } else {
        onChange({
          range: undefined,
        });
      }
    },
    [onChange],
  );

  return (
    <FilterContainer
      alwaysShowFilterString
      filterString={changes}
      nonCollapsibleContent={
        !filter.open && (
          <ToggleGroup
            data-testid="filters-level-shortcut"
            full
            onValueChange={onApplyLevelShortcut}
            type="single"
            value={getToggleValue(filter.value.range)}
          >
            <ToggleGroupItem value="0">
              {t("common.level.value", { level: "0" })}
            </ToggleGroupItem>
            <ToggleGroupItem value="1-5">
              {t("common.level.value", { level: "1-5" })}
            </ToggleGroupItem>
          </ToggleGroup>
        )
      }
      onOpenChange={onToggleOpen}
      onReset={onReset}
      open={filter.open}
      title={t("filters.level.title")}
    >
      <RangeSelect
        id="level-select"
        label={t("filters.level.title")}
        max={5}
        min={-1}
        renderLabel={levelToString}
        onValueCommit={(val) => {
          onChangeRange([val[0], val[1]]);
        }}
        value={filter.value.range ?? [0, 5]}
      />
      <CheckboxGroup>
        <Checkbox
          checked={filter.value.exceptional}
          id="exceptional"
          label={t("common.exceptional")}
          onCheckedChange={onSetExceptional}
        />
        <Checkbox
          checked={filter.value.nonexceptional}
          id="nonexceptional"
          label={t("common.nonexceptional")}
          onCheckedChange={onSetNonexceptional}
        />
      </CheckboxGroup>
    </FilterContainer>
  );
}
