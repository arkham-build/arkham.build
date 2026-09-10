import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  levelToString,
  selectActiveListFilter,
  selectFilterChanges,
  selectListFilterProperties,
} from "@/store/selectors/lists";
import { isLevelFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { RangeSelect } from "../ui/range-select";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilter } from "./primitives/filter-hooks";

type LevelShortcut = "0" | "1-5";

function getToggleValue(
  value: [number, number] | undefined,
): LevelShortcut | undefined {
  if (!value) return undefined;
  if (value[0] === 0 && value[1] === 0) return "0";
  if (value[0] === 1 && value[1] === 5) return "1-5";
  return undefined;
}

export function LevelFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  const listProperties = useStore((state) =>
    selectListFilterProperties(state, resolvedDeck, targetDeck),
  );

  assert(
    isLevelFilterObject(filter),
    `LevelFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const { onReset, onChange, onOpenChange, locked } = useFilter(id);

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
        onChangeRange([-1, 5]);
      }
      onOpenChange(val);
    },
    [onChangeRange, filter.value.range, onOpenChange],
  );

  const levelShortcut = getToggleValue(filter.value.range);

  const onApplyLevelShortcut = useCallback(
    (value: LevelShortcut) => {
      if (value === levelShortcut) {
        onChange({
          range: undefined,
        });
        return;
      }

      onChange({
        range: value === "0" ? [0, 0] : [1, 5],
      });
    },
    [levelShortcut, onChange],
  );

  return (
    <FilterContainer
      alwaysShowChanges
      changes={changes}
      locked={locked}
      nonCollapsibleContent={
        !filter.open &&
        listProperties.levels.size > 1 && (
          <ToggleGroup
            disabled={locked}
            data-testid="filters-level-shortcut"
            full
            onValueChange={onApplyLevelShortcut}
            type="single"
            value={levelShortcut}
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
        disabled={locked}
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
    </FilterContainer>
  );
}
