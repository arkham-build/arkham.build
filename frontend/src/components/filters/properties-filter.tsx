import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectPropertyOptions } from "@/store/selectors/lists";
import type { PropertiesFilter as PropertiesFilterType } from "@/store/slices/lists.types";
import { FactionIconFancy } from "../icons/faction-icon-fancy";
import { Checkbox } from "../ui/checkbox";
import { CheckboxGroup } from "../ui/checkboxgroup";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useActiveFilter, useFilter } from "./primitives/filter-hooks";

export function PropertiesFilter({ id }: FilterProps) {
  const { filter, changes } = useActiveFilter(id, "properties");
  const { t } = useTranslation();

  const { onReset, onChange, onOpenChange, locked } = useFilter(id);

  const properties = useStore(selectPropertyOptions);

  const onPropertyChange = (
    key: keyof PropertiesFilterType,
    value: boolean,
  ) => {
    onChange({
      [key]: value,
    });
  };

  const renderProperty = (key: string, label: string) => {
    if (key === "unique") {
      return (
        <>
          {label} (
          <i className="icon-unique" style={{ fontSize: "var(--text-2xs)" }} />)
        </>
      );
    }

    if (key === "multiClass") {
      return (
        <>
          {label} (<FactionIconFancy code="multiclass" />)
        </>
      );
    }

    return label;
  };

  return (
    <FilterContainer
      changes={changes}
      locked={locked}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={filter.open}
      title={t("filters.properties.title")}
    >
      <CheckboxGroup cols={2}>
        {properties.map(({ key, label }) => (
          <Checkbox
            disabled={locked}
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
