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
import type { SearchFilters } from "@/store/slices/decklists-filters.types";
import { and, not } from "@/utils/fp";

export type DecklistFilterProps = {
  disabled?: boolean;
  formState: SearchFilters;
  setFormState: React.Dispatch<React.SetStateAction<SearchFilters>>;
};

export const selectPlayerCards = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (metadata, lookupTables, collator) => {
    const playerCardFilter = and([
      not(filterEncounterCards),
      not(filterType(["investigator"])),
      filterDuplicates,
      (c) => lookupTables.relations.bonded[c.code] == null,
      (c) => c.official !== false,
    ]);

    const playerCards = Object.values(metadata.cards).filter(playerCardFilter);

    const sortFn = makeSortFunction(
      ["name", "level", "position"],
      metadata,
      collator,
    );

    return playerCards.sort(sortFn);
  },
);
