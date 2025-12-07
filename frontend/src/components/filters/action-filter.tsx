import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Coded } from "@/store/lib/types";
import {
  selectActionMapper,
  selectActionOptions,
  selectActiveListFilter,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { isActionFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function ActionFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();
  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isActionFilterObject(filter),
    `ActionFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const options = useStore((state) =>
    selectActionOptions(state, resolvedDeck, targetDeck),
  );

  const actionMapper = useStore(selectActionMapper);

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
      value={filter.value.map(actionMapper)}
    />
  );
}
