import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectFilterChanges,
  selectHealthMinMax,
} from "@/store/selectors/lists";
import { isHealthFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import type { FilterProps } from "./filters.types";
import { RangeFilter } from "./primitives/range-filter";

export function HealthFilter(props: FilterProps) {
  const { id, resolvedDeck, targetDeck } = props;
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isHealthFilterObject(filter),
    `SanityFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

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
