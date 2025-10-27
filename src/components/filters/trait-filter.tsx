import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Coded } from "@/store/lib/types";
import {
  selectActiveListFilter,
  selectFilterChanges,
  selectTraitOptions,
} from "@/store/selectors/lists";
import { selectTraitMapper } from "@/store/selectors/shared";
import { isTraitFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function TraitFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();
  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isTraitFilterObject(filter),
    `PackFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const options = useStore((state) =>
    selectTraitOptions(state, resolvedDeck, targetDeck),
  );

  const traitMapper = useStore(selectTraitMapper);

  const nameRenderer = useCallback((c: Coded & { name: string }) => c.name, []);

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      itemToString={nameRenderer}
      open={filter.open}
      options={options}
      nameRenderer={nameRenderer}
      placeholder={t("filters.trait.placeholder")}
      title={t("filters.trait.title")}
      value={filter.value.map(traitMapper)}
    />
  );
}
