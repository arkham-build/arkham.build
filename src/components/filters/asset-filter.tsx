import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectAssetOptions,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { isAssetFilterObject } from "@/store/slices/lists.type-guards";
import type { AssetFilter as AssetFilterType } from "@/store/slices/lists.types";
import { assert } from "@/utils/assert";
import { SkillIcon } from "../icons/skill-icon";
import SlotIcon from "../icons/slot-icon";
import { Checkbox } from "../ui/checkbox";
import { Combobox } from "../ui/combobox/combobox";
import { RangeSelect } from "../ui/range-select";
import css from "./filters.module.css";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilterCallbacks } from "./primitives/filter-hooks";

type Option = {
  code: string;
  name: string;
};

function renderName(c: Option) {
  return c.name;
}

function renderSlot(c: Option) {
  return (
    <>
      <SlotIcon code={c.code} /> {c.name}
    </>
  );
}

export function AssetFilter({ id, resolvedDeck }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isAssetFilterObject(filter),
    `AssetFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const options = useStore((state) => selectAssetOptions(state, resolvedDeck));

  const { onReset, onChange, onOpenChange } =
    useFilterCallbacks<Partial<AssetFilterType>>(id);

  const onChangeUses = useCallback(
    (value: string[]) => {
      onChange({ uses: value });
    },
    [onChange],
  );

  const onChangeSlot = useCallback(
    (value: string[]) => {
      onChange({ slots: value });
    },
    [onChange],
  );

  const onChangeRange = useCallback(
    function setValue<K extends keyof AssetFilterType>(
      key: K,
      value: AssetFilterType[K],
    ) {
      onChange({ [key]: value });
    },
    [onChange],
  );

  const onSkillBoostChange = useCallback(
    (code: string, value: string | boolean) => {
      if (typeof value === "boolean") {
        const next = [...filter.value.skillBoosts];
        if (value) {
          next.push(code);
        } else {
          const idx = next.indexOf(code);
          if (idx !== -1) {
            next.splice(idx, 1);
          }
        }

        onChange({ skillBoosts: next });
      }
    },
    [onChange, filter.value.skillBoosts],
  );

  const onHealthXChange = useCallback(
    (value: boolean) => {
      onChange({ healthX: value });
    },
    [onChange],
  );

  return (
    <FilterContainer
      className={css["asset-filter"]}
      changes={changes}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={filter.open}
      title={t("filters.asset.title")}
    >
      <Combobox
        id="asset-slots"
        items={options.slots}
        label={t("filters.slot.title")}
        onValueChange={onChangeSlot}
        placeholder={t("filters.slot.placeholder")}
        renderItem={renderSlot}
        renderResult={renderSlot}
        selectedItems={filter.value.slots}
        showLabel
      />

      <fieldset className={css["skill-boosts"]}>
        <legend className={css["skill-boosts-label"]}>
          {t("filters.skill_boost.title")}
        </legend>
        {options.skillBoosts.map((skill) => (
          <Checkbox
            checked={filter.value.skillBoosts.includes(skill)}
            id={`asset-skillboost-${skill}`}
            key={skill}
            label={<SkillIcon skill={skill} />}
            onCheckedChange={(val) => onSkillBoostChange(skill, val)}
          />
        ))}
      </fieldset>

      <Combobox
        id="asset-uses"
        items={options.uses}
        label={t("filters.uses.title")}
        onValueChange={onChangeUses}
        placeholder={t("filters.uses.placeholder")}
        renderItem={renderName}
        renderResult={renderName}
        selectedItems={filter.value.uses}
        showLabel
      />

      <RangeSelect
        id="asset-health"
        label={t("filters.health.title")}
        max={options.health.max}
        min={options.health.min}
        onValueCommit={(val) => {
          onChangeRange("health", [val[0], val[1]]);
        }}
        showLabel
        value={filter.value.health ?? [options.health.min, options.health.max]}
      />

      <RangeSelect
        id="asset-sanity"
        label={t("filters.sanity.title")}
        max={options.sanity.max}
        min={options.sanity.min}
        onValueCommit={(val) => {
          onChangeRange("sanity", [val[0], val[1]]);
        }}
        showLabel
        value={filter.value.sanity ?? [options.sanity.min, options.sanity.max]}
      />

      <Checkbox
        checked={filter.value.healthX}
        id="asset-health-x"
        label={t("filters.health_sanity_x")}
        onCheckedChange={onHealthXChange}
      />
    </FilterContainer>
  );
}
