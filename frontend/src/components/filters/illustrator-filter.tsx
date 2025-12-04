import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectIllustratorChanges,
  selectIllustratorOptions,
} from "@/store/selectors/lists";
import { isIllustratorFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function IllustratorFilter({
  id,
  resolvedDeck,
  targetDeck,
}: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isIllustratorFilterObject(filter),
    `IllustratorFilter instantiated with '${filter?.type}'`,
  );

  const changes = selectIllustratorChanges(filter.value);
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
