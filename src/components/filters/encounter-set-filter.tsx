import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectEncounterSetOptions,
  selectFilterChanges,
} from "@/store/selectors/lists";
import type { EncounterSet } from "@/store/services/queries.types";
import { isEncounterSetFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import EncounterIcon from "../icons/encounter-icon";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function EncounterSetFilter({ id }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isEncounterSetFilterObject(filter),
    `EncounterSetFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const options = useStore(selectEncounterSetOptions);

  const nameRenderer = useCallback(
    (set: EncounterSet) => <EncounterSetName set={set} />,
    [],
  );

  const itemToString = useCallback(
    (set: EncounterSet) => set.name.toLowerCase(),
    [],
  );

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      itemToString={itemToString}
      nameRenderer={nameRenderer}
      open={filter.open}
      options={options}
      placeholder={t("filters.encounter_set.placeholder")}
      title={t("filters.encounter_set.title")}
      value={filter.value}
    />
  );
}

function EncounterSetName({ set }: { set: EncounterSet }) {
  return (
    <>
      <EncounterIcon code={set.code} />
      {set.name}
    </>
  );
}
