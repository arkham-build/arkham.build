import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveList,
  selectActiveListFilter,
  selectFilterChanges,
  selectTypeOptions,
} from "@/store/selectors/lists";
import type { Type } from "@/store/services/queries.types";
import { isTypeFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

const nameRenderer = (item: Type) => item.name;
const itemToString = (item: Type) => item.name.toLowerCase();

export function TypeFilter({ id, resolvedDeck }: FilterProps) {
  const { t } = useTranslation();

  const activeList = useStore(selectActiveList);
  const filter = useStore((state) => selectActiveListFilter(state, id));
  const setFilterValue = useStore((state) => state.setFilterValue);

  assert(
    isTypeFilterObject(filter),
    `TypeFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const options = useStore((state) => selectTypeOptions(state, resolvedDeck));

  const onApplyShortcut = useCallback(
    (value: string[]) => {
      setFilterValue(id, value);
    },
    [id, setFilterValue],
  );

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      itemToString={itemToString}
      nameRenderer={nameRenderer}
      open={filter.open}
      options={options}
      placeholder={t("filters.type.placeholder")}
      title={t("filters.type.title")}
      value={filter.value}
    >
      {!filter.open && activeList?.cardType === "player" && (
        <ToggleGroup
          data-testid="filters-type-shortcut"
          full
          onValueChange={onApplyShortcut}
          type="multiple"
          value={filter.value}
        >
          <ToggleGroupItem value="asset">
            {t("common.type.asset")}
          </ToggleGroupItem>
          <ToggleGroupItem value="event">
            {t("common.type.event")}
          </ToggleGroupItem>
          <ToggleGroupItem value="skill">
            {t("common.type.skill")}
          </ToggleGroupItem>
        </ToggleGroup>
      )}
    </MultiselectFilter>
  );
}
