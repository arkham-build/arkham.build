import type { Cycle } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectCycleMapper, selectCycleOptions } from "@/store/selectors/lists";
import { displayPackName } from "@/utils/formatting";
import PackIcon from "../icons/pack-icon";
import type { FilterProps } from "./filters.types";
import { useActiveFilter } from "./primitives/filter-hooks";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function CycleFilter({ id }: FilterProps) {
  const { t } = useTranslation();

  const { filter, changes } = useActiveFilter(id, "cycle");

  const cycleMapper = useStore(selectCycleMapper);

  const cycleOptions = useStore(selectCycleOptions);

  const itemToString = (cycle: Cycle | undefined) =>
    cycle ? displayPackName(cycle) : "";

  const nameRenderer = (cycle: Cycle | undefined) => {
    if (!cycle) return undefined;

    return (
      <>
        <PackIcon code={cycle.code} />
        {displayPackName(cycle)}
      </>
    );
  };

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
