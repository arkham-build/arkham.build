import { createSelector } from "reselect";
import {
  filterDuplicates,
  filterEncounterCards,
  filterType,
} from "@/store/lib/filtering";
import { makeSortFunction } from "@/store/lib/sorting";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import type { DecklistsFiltersState } from "@/store/services/requests/decklists-search";
import { official } from "@/utils/card-utils";
import { and, not } from "@/utils/fp";

export type DecklistFilterProps = {
  disabled?: boolean;
  formState: DecklistsFiltersState["filters"];
  setFormState: React.Dispatch<
    React.SetStateAction<DecklistsFiltersState["filters"]>
  >;
};

export const selectPlayerCardsFilter = createSelector(
  selectLookupTables,
  (lookupTables) => {
    const playerCardFilter = and([
      not(filterEncounterCards),
      not(filterType(["investigator"])),
      filterDuplicates,
      (c) => lookupTables.relations.bonded[c.code] == null,
      (c) => official(c),
    ]);

    return playerCardFilter;
  },
);

export const selectPlayerCardsSort = createSelector(
  selectMetadata,
  selectLocaleSortingCollator,
  (metadata, collator) => {
    return makeSortFunction(["name", "level", "position"], metadata, collator);
  },
);
