import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectFilterChanges,
  selectSanityMinMax,
} from "@/store/selectors/lists";
import { isSanityFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import type { FilterProps } from "./filters.types";
import { RangeFilter } from "./primitives/range-filter";

export function SanityFilter(props: FilterProps) {
  const { id, resolvedDeck, targetDeck } = props;
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isSanityFilterObject(filter),
    `SanityFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

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
