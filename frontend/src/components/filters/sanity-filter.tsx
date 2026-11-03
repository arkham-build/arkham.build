import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectSanityMinMax } from "@/store/selectors/lists";
import type { FilterProps } from "./filters.types";
import { useActiveFilter } from "./primitives/filter-hooks";
import { RangeFilter } from "./primitives/range-filter";

export function SanityFilter(props: FilterProps) {
  const { id, resolvedDeck, targetDeck } = props;
  const { t } = useTranslation();

  const { filter, changes } = useActiveFilter(id, "sanity");

  const { min, max } = useStore((state) =>
    selectSanityMinMax(state, resolvedDeck, targetDeck),
  );

  return (
    <RangeFilter
      changes={changes}
      data-testid="filter-sanity"
      id={id}
      min={min}
      max={max}
      open={filter.open}
      title={t("filters.sanity.title")}
      value={filter.value}
    />
  );
}
