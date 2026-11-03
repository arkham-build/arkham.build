import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectHealthMinMax } from "@/store/selectors/lists";
import type { FilterProps } from "./filters.types";
import { useActiveFilter } from "./primitives/filter-hooks";
import { RangeFilter } from "./primitives/range-filter";

export function HealthFilter(props: FilterProps) {
  const { id, resolvedDeck, targetDeck } = props;
  const { t } = useTranslation();

  const { filter, changes } = useActiveFilter(id, "health");

  const { min, max } = useStore((state) =>
    selectHealthMinMax(state, resolvedDeck, targetDeck),
  );

  return (
    <RangeFilter
      changes={changes}
      data-testid="filter-health"
      id={id}
      min={min}
      max={max}
      open={filter.open}
      title={t("filters.health.title")}
      value={filter.value}
    />
  );
}
