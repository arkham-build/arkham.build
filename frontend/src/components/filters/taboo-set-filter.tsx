import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectListFilterProperties,
  selectTabooSetOptions,
} from "@/store/selectors/lists";
import { formatTabooSet } from "@/utils/formatting";
import type { FilterProps } from "./filters.types";
import { useActiveFilter } from "./primitives/filter-hooks";
import { SelectFilter } from "./primitives/select-filter";

export function TabooSetFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();

  const { filter, changes } = useActiveFilter(id, "taboo_set");

  const listFilterProperties = useStore((state) =>
    selectListFilterProperties(state, resolvedDeck, targetDeck),
  );

  const options = useStore(selectTabooSetOptions);

  if (!listFilterProperties.cardTypes.has("player") && !filter.value) {
    return null;
  }

  return (
    <SelectFilter
      changes={changes}
      id={id}
      mapValue={(val) => (val ? +val : undefined)}
      open={filter.open}
      options={options}
      renderOption={(set) => (
        <option key={set.id} value={set.id}>
          {formatTabooSet(set)}
        </option>
      )}
      title={t("common.taboo")}
      value={filter.value}
    />
  );
}
