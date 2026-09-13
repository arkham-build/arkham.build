import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectFilterChanges,
  selectSubtypeOptions,
} from "@/store/selectors/lists";
import { isSubtypeFilterObject } from "@/store/slices/lists.type-guards";
import type { SubtypeFilter as SubtypeFilterType } from "@/store/slices/lists.types";
import { assert } from "@/utils/assert";
import { Checkbox } from "../ui/checkbox";
import { CheckboxGroup } from "../ui/checkboxgroup";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilter } from "./primitives/filter-hooks";

export function SubtypeFilter({ id }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));
  assert(
    isSubtypeFilterObject(filter),
    `SubtypeFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const options = selectSubtypeOptions();

  const { onReset, onOpenChange, onChange, locked } = useFilter(id);

  const onValueChange = useCallback(
    (key: keyof SubtypeFilterType, value: boolean) => {
      onChange({
        [key]: value,
      });
    },
    [onChange],
  );

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
