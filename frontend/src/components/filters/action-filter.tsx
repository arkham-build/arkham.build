import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Coded } from "@/store/lib/types";
import {
  selectActionMapper,
  selectActionOptions,
} from "@/store/selectors/lists";
import type { FilterProps } from "./filters.types";
import { useActiveFilter } from "./primitives/filter-hooks";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function ActionFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();
  const { filter, changes } = useActiveFilter(id, "action");

  const options = useStore((state) =>
    selectActionOptions(state, resolvedDeck, targetDeck),
  );

  const actionMapper = useStore(selectActionMapper);

  const nameRenderer = (item: Coded & { name: string }) => item.name;

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
