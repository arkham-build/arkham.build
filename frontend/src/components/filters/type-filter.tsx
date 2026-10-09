import type { JsonDataType } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectFilterChanges,
  selectListFilterProperties,
  selectTypeMapper,
  selectTypeOptions,
} from "@/store/selectors/lists";
import { isTypeFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

const nameRenderer = (item: JsonDataType) => item.name;
const itemToString = (item: JsonDataType) => item.name.toLowerCase();

const PLAYER_TYPE_SHORTCUTS = ["asset", "event", "skill"] as const;
const CAMPAIGN_TYPE_SHORTCUTS = ["location", "enemy", "treachery"] as const;

export function TypeFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));
  const setFilterValue = useStore((state) => state.setFilterValue);

  const listProperties = useStore((state) =>
    selectListFilterProperties(state, resolvedDeck, targetDeck),
  );

  assert(
    isTypeFilterObject(filter),
    `TypeFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const options = useStore((state) =>
    selectTypeOptions(state, resolvedDeck, targetDeck),
  );

  const onApplyShortcut = (value: string[]) => {
    setFilterValue(id, value);
  };

  const typeMapper = useStore(selectTypeMapper);

  const shortcutTypes = !listProperties.cardTypes.has("player")
    ? CAMPAIGN_TYPE_SHORTCUTS
    : PLAYER_TYPE_SHORTCUTS;

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
      value={filter.value.map(typeMapper)}
    >
      {!filter.open && (
        <ToggleGroup
          data-testid="filters-type-shortcut"
          full
          onValueChange={onApplyShortcut}
          type="multiple"
          value={filter.value}
        >
          {shortcutTypes.map(
            (type) =>
              listProperties.types.has(type) && (
                <ToggleGroupItem key={type} value={type}>
                  {t(`common.type.${type}`)}
                </ToggleGroupItem>
              ),
          )}
        </ToggleGroup>
      )}
    </MultiselectFilter>
  );
}
