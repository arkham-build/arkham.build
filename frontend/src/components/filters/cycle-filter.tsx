import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Cycle } from "@/store/schemas/cycle.schema";
import {
  selectActiveListFilter,
  selectCycleMapper,
  selectCycleOptions,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { isCycleFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { displayPackName } from "@/utils/formatting";
import PackIcon from "../icons/pack-icon";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function CycleFilter({ id }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isCycleFilterObject(filter),
    `CycleFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const cycleMapper = useStore(selectCycleMapper);

  const cycleOptions = useStore(selectCycleOptions);

  const itemToString = useCallback(
    (cycle: Cycle | undefined) => (cycle ? displayPackName(cycle) : ""),
    [],
  );

  const nameRenderer = useCallback((cycle: Cycle | undefined) => {
    if (!cycle) return undefined;

    return (
      <>
        <PackIcon code={cycle.code} />
        {displayPackName(cycle)}
      </>
    );
  }, []);

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      itemToString={itemToString}
      nameRenderer={nameRenderer}
      open={filter.open}
      options={cycleOptions}
      placeholder={t("filters.cycle.placeholder")}
      title={t("filters.cycle.title")}
      value={filter.value.map(cycleMapper)}
    />
  );
}
