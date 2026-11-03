import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Coded } from "@/store/lib/types";
import { selectTraitOptions } from "@/store/selectors/lists";
import { selectTraitMapper } from "@/store/selectors/shared";
import type { FilterProps } from "./filters.types";
import { useActiveFilter } from "./primitives/filter-hooks";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function TraitFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();
  const { filter, changes } = useActiveFilter(id, "trait");

  const options = useStore((state) =>
    selectTraitOptions(state, resolvedDeck, targetDeck),
  );

  const traitMapper = useStore(selectTraitMapper);

  const nameRenderer = (c: Coded & { name: string }) => c.name;

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
