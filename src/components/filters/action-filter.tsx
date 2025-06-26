import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActionOptions,
  selectActiveListFilter,
  selectFilterChanges,
} from "@/store/selectors/lists";
import type { Coded } from "@/store/services/queries.types";
import { isActionFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function ActionFilter({ id, resolvedDeck }: FilterProps) {
  const { t } = useTranslation();
  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isActionFilterObject(filter),
    `ActionFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const options = useStore((state) => selectActionOptions(state, resolvedDeck));

  const nameRenderer = useCallback(
    (item: Coded & { name: string }) => item.name,
    [],
  );

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      nameRenderer={nameRenderer}
      open={filter.open}
      options={options}
      itemToString={nameRenderer}
      placeholder={t("filters.action.placeholder")}
      title={t("filters.action.title")}
      value={filter.value}
    />
  );
}
