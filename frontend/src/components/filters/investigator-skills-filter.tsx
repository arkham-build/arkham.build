import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectFilterChanges,
  selectSkillIconsMinMax,
} from "@/store/selectors/lists";
import { isInvestigatorSkillsFilterObject } from "@/store/slices/lists.type-guards";
import type { InvestigatorSkillsFilter as InvestigatorSkillsFilterType } from "@/store/slices/lists.types";
import { assert } from "@/utils/assert";
import { SKILL_KEYS, type SkillKey } from "@/utils/constants";
import { SkillIconFancy } from "../icons/skill-icon-fancy";
import { RangeSelect } from "../ui/range-select";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { FilterProps } from "./filters.types";
import css from "./investigator-skills-filter.module.css";
import { FilterContainer } from "./primitives/filter-container";
import { useFilter } from "./primitives/filter-hooks";

const INVESTIGATOR_SKILL_KEYS: SkillKey[] = SKILL_KEYS.filter(
  (key) => key !== "wild",
);

export function InvestigatorSkillsFilter(props: FilterProps) {
  const { id, resolvedDeck, targetDeck } = props;
  const { t } = useTranslation();

  const { onReset, onChange, onOpenChange, locked } =
    useFilter<InvestigatorSkillsFilterType>(id);

  const filter = useStore((state) => selectActiveListFilter(state, id));

  const skillsMinMax = useStore((state) =>
    selectSkillIconsMinMax(state, resolvedDeck, targetDeck),
  );

  assert(
    isInvestigatorSkillsFilterObject(filter),
    `InvestigatorSkillsFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const onSetShortcut = useCallback(
    (keys: SkillKey[]) => {
      const value = INVESTIGATOR_SKILL_KEYS.reduce((acc, key) => {
        if (keys.includes(key)) {
          acc[key as keyof InvestigatorSkillsFilterType] = [
            4,
            skillsMinMax[key].max,
          ];
        } else {
          acc[key as keyof InvestigatorSkillsFilterType] = undefined;
        }
        return acc;
      }, {} as InvestigatorSkillsFilterType);

      onChange(value);
    },
    [onChange, skillsMinMax],
  );

  const shortcutValue = useMemo(() => {
    return Object.entries(filter.value)
      .filter(([, value]) => value?.[0] === 4)
      .map(([key]) => key as SkillKey);
  }, [filter.value]);

  const onRangeChange = useCallback(
    (key: SkillKey, value: [number, number]) => {
      onChange({ ...filter.value, [key]: value });
    },
    [filter.value, onChange],
  );

  return (
    <FilterContainer
      changes={changes}
      locked={locked}
      onReset={onReset}
      onOpenChange={onOpenChange}
      open={filter.open}
      title={t("filters.investigator_skills.title")}
      nonCollapsibleContent={
        !filter.open && (
          <ToggleGroup
            disabled={locked}
            type="multiple"
            full
            onValueChange={onSetShortcut}
            value={shortcutValue}
          >
            {INVESTIGATOR_SKILL_KEYS.map((key) => (
              <ToggleGroupItem
                className={css["toggle"]}
                data-testid={`filter-investigator-skills-shortcut-${key}`}
                key={key}
                value={key}
              >
                4+
                <SkillIconFancy skill={key} />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )
      }
    >
      {INVESTIGATOR_SKILL_KEYS.map((key) => (
        <RangeSelect
          disabled={locked}
          key={key}
          data-testid={`filter-investigator-skills-${key}`}
          id={`$filter-${id}-${key}`}
          showLabel
          label={
            <>
              <SkillIconFancy className={css["icon"]} skill={key} />
              {t(`common.skill.${key}`)}
            </>
          }
          min={skillsMinMax[key].min}
          max={skillsMinMax[key].max}
          value={
            filter.value[key as keyof InvestigatorSkillsFilterType] ?? [
              skillsMinMax[key].min,
              skillsMinMax[key].max,
            ]
          }
          onValueCommit={(value) =>
            onRangeChange(key, value as [number, number])
          }
        />
      ))}
    </FilterContainer>
  );
}
