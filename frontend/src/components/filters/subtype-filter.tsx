import { useTranslation } from "react-i18next";
import { selectSubtypeOptions } from "@/store/selectors/lists";
import type { SubtypeFilter as SubtypeFilterType } from "@/store/slices/lists.types";
import { Checkbox } from "../ui/checkbox";
import { CheckboxGroup } from "../ui/checkboxgroup";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useActiveFilter, useFilter } from "./primitives/filter-hooks";

export function SubtypeFilter({ id }: FilterProps) {
  const { t } = useTranslation();

  const { filter, changes } = useActiveFilter(id, "subtype");

  const options = selectSubtypeOptions();

  const { onReset, onOpenChange, onChange, locked } = useFilter(id);

  const onValueChange = (key: keyof SubtypeFilterType, value: boolean) => {
    onChange({
      [key]: value,
    });
  };

  return (
    <FilterContainer
      changes={changes}
      data-testid="subtype-filter"
      locked={locked}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={filter.open}
      title={t("filters.subtype.title")}
    >
      <CheckboxGroup>
        {options.map(({ code, name }) => (
          <Checkbox
            disabled={locked}
            checked={filter.value[code as keyof SubtypeFilterType]}
            data-key={code}
            data-testid={`subtype-${code}`}
            id={`property-${code}`}
            key={code}
            label={name}
            onCheckedChange={(val) =>
              onValueChange(code as keyof SubtypeFilterType, !!val)
            }
          />
        ))}
      </CheckboxGroup>
    </FilterContainer>
  );
}
