import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectFilterChanges,
  selectPropertyOptions,
} from "@/store/selectors/lists";
import { isPropertiesFilterObject } from "@/store/slices/lists.type-guards";
import type { PropertiesFilter as PropertiesFilterType } from "@/store/slices/lists.types";
import { assert } from "@/utils/assert";
import { FactionIconFancy } from "../icons/faction-icon-fancy";
import { Checkbox } from "../ui/checkbox";
import { CheckboxGroup } from "../ui/checkboxgroup";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilterCallbacks } from "./primitives/filter-hooks";

export function PropertiesFilter({ id }: FilterProps) {
  const filter = useStore((state) => selectActiveListFilter(state, id));
  const { t } = useTranslation();

  assert(
    isPropertiesFilterObject(filter),
    `PropertiesFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const { onReset, onChange, onOpenChange } = useFilterCallbacks(id);

  const properties = useStore(selectPropertyOptions);

  const onPropertyChange = useCallback(
    (key: keyof PropertiesFilterType, value: boolean) => {
      onChange({
        [key]: value,
      });
    },
    [onChange],
  );

  const renderProperty = useCallback((key: string, label: string) => {
    if (key === "unique") {
      return <>{label} (&#10040;)</>;
    }

    if (key === "multiClass") {
      return (
        <>
          {label} (<FactionIconFancy code="multiclass" />)
        </>
      );
    }

    return label;
  }, []);

  return (
    <FilterContainer
      changes={changes}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={filter.open}
      title={t("filters.properties.title")}
    >
      <CheckboxGroup cols={2}>
        {properties.map(({ key, label }) => (
          <Checkbox
            checked={filter.value[key as keyof PropertiesFilterType]}
            data-key={key}
            id={`property-${key}`}
            key={key}
            label={renderProperty(key, label)}
            onCheckedChange={(val) =>
              onPropertyChange(key as keyof PropertiesFilterType, !!val)
            }
          />
        ))}
      </CheckboxGroup>
    </FilterContainer>
  );
}
