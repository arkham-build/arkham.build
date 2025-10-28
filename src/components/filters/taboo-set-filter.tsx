import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectFilterChanges,
  selectListFilterProperties,
  selectTabooSetOptions,
} from "@/store/selectors/lists";
import { isTabooSetFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { formatTabooSet } from "@/utils/formatting";
import type { FilterProps } from "./filters.types";
import { SelectFilter } from "./primitives/select-filter";

export function TabooSetFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  const listFilterProperties = useStore((state) =>
    selectListFilterProperties(state, resolvedDeck, targetDeck),
  );

  assert(
    isTabooSetFilterObject(filter),
    `TabooSetFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
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
