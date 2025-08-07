import type { SortType } from "../services/requests/decklist-search";

export type DecklistsFiltersState = {
  filters: {
    analyzeSideDecks: boolean;
    authorName: string;
    canonicalInvestigatorCode: string | undefined;
    dateRange: [string, string] | undefined;
    description_length: number;
    excluded_cards: string[];
    investigatorFactions: string[];
    name: string | undefined;
    requiredCards: string[];
  };
  offset: number;
  sortBy: SortType;
};

export type SearchFilters = DecklistsFiltersState["filters"];

export type DecklistsFiltersSlice = {
  decklistsFilters: DecklistsFiltersState;
  setDecklistsSortBy: (sortBy: SortType) => void;
  setDecklistsOffset: (offset: number) => void;
  setDecklistsFilters: (filters: SearchFilters) => void;
  resetDecklistsFilters: () => void;
};
