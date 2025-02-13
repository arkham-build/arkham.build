import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectTraitChanges,
} from "@/store/selectors/lists";
import { selectTraitOptions } from "@/store/selectors/lists";
import type { Coded } from "@/store/services/queries.types";
import { isTraitFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function TraitFilter({ id, resolvedDeck }: FilterProps) {
  const { t } = useTranslation();
  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isTraitFilterObject(filter),
    `PackFilter instantiated with '${filter?.type}'`,
  );

  const changes = selectTraitChanges(filter.value);
  const options = useStore((state) => selectTraitOptions(state, resolvedDeck));

  const nameRenderer = useCallback((c: Coded & { name: string }) => c.name, []);

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      open={filter.open}
      options={options}
      nameRenderer={nameRenderer}
      placeholder={t("filters.trait.placeholder")}
      title={t("filters.trait.title")}
      value={filter.value}
    />
  );
}
