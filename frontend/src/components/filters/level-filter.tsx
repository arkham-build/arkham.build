import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  levelToString,
  selectListFilterProperties,
} from "@/store/selectors/lists";
import { RangeSelect } from "../ui/range-select";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useActiveFilter, useFilter } from "./primitives/filter-hooks";

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

  const { filter, changes } = useActiveFilter(id, "level");

  const listProperties = useStore((state) =>
    selectListFilterProperties(state, resolvedDeck, targetDeck),
  );

  const { onReset, onChange, onOpenChange, locked } = useFilter(id);

  const onChangeRange = (val: [number, number] | undefined) => {
    onChange({
      range: val,
    });
  };

  const onToggleOpen = (val: boolean) => {
    if (val && !filter.value.range) {
      onChangeRange([0, 5]);
    }
    onOpenChange(val);
  };

  const levelShortcut = getToggleValue(filter.value.range);

  const onApplyLevelShortcut = (value: LevelShortcut) => {
    if (value === levelShortcut) {
      onChange({
        range: undefined,
      });
      return;
    }

    onChange({
      range: value === "0" ? [0, 0] : [1, 5],
    });
  };

  return (
    <FilterContainer
      alwaysShowChanges
      changes={changes}
      locked={locked}
      nonCollapsibleContent={
        !filter.open &&
        listProperties.cardTypes.has("player") &&
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
