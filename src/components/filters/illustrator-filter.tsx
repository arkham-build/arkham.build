import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectIllustratorChanges,
  selectIllustratorOptions,
} from "@/store/selectors/lists";
import { isIllustratorFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { useTranslation } from "react-i18next";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function IllustratorFilter({ id }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isIllustratorFilterObject(filter),
    `IllustratorFilter instantiated with '${filter?.type}'`,
  );

  const changes = selectIllustratorChanges(filter.value);
  const options = useStore(selectIllustratorOptions);

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      open={filter.open}
      options={options}
      placeholder={t("filters.illustrator.placeholder")}
      title={t("filters.illustrator.title")}
      value={filter.value}
    />
  );
}
