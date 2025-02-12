import { useStore } from "@/store";
import { selectActiveListFilter } from "@/store/selectors/lists";
import {
  selectSubtypeChanges,
  selectSubtypeOptions,
} from "@/store/selectors/lists";
import { isSubtypeFilterObject } from "@/store/slices/lists.type-guards";
import type { SubtypeFilter as SubtypeFilterType } from "@/store/slices/lists.types";
import { assert } from "@/utils/assert";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "../ui/checkbox";
import { CheckboxGroup } from "../ui/checkboxgroup";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilterCallbacks } from "./primitives/filter-hooks";

export function SubtypeFilter({ id }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));
  assert(
    isSubtypeFilterObject(filter),
    `SubtypeFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectSubtypeChanges(state, filter.value),
  );

  const options = selectSubtypeOptions();

  const { onReset, onOpenChange, onChange } = useFilterCallbacks(id);

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
      data-testid="subtype-filter"
      filterString={changes}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={filter.open}
      title={t("filters.subtype.title")}
    >
      <CheckboxGroup>
        {options.map(({ code, name }) => (
          <Checkbox
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
