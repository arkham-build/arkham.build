import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectIllustratorOptions } from "@/store/selectors/lists";
import type { FilterProps } from "./filters.types";
import { useActiveFilter } from "./primitives/filter-hooks";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function IllustratorFilter({
  id,
  resolvedDeck,
  targetDeck,
}: FilterProps) {
  const { t } = useTranslation();

  const { filter, changes } = useActiveFilter(id, "illustrator");

  const options = useStore((state) =>
    selectIllustratorOptions(state, resolvedDeck, targetDeck),
  );

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      open={filter.open}
      options={options}
      placeholder={t("filters.illustrator.placeholder")}
      title={t("filters.illustrator.title")}
      value={filter.value.map((i) => ({ code: i }))}
    />
  );
}
