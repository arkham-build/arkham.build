import type { StorageProvider } from "@/utils/constants";

export type DeckProperties = Record<DeckPropertyName, string | boolean>;

type DeckFiltersType = {
  cards: string[];
  xpCost: RangeMinMax;
  faction: string[];
  properties: DeckProperties;
  provider: StorageProvider[];
  search: string;
  tags: string[];
  validity: DeckValidity;
};

export type RangeMinMax = undefined | [number, number];
export type DeckValidity = "valid" | "invalid" | "all";

export type DeckFiltersKey = keyof DeckFiltersType;
type DeckFiltersValue<P extends DeckFiltersKey> = DeckFiltersType[P];

type CollapsibleFilter = Exclude<DeckFiltersKey, "faction" | "search">;

export type SortOrder = "asc" | "desc";

export type DeckCollectionState = {
  expandedFolders: Record<string, boolean>;
  filters: DeckFiltersType;
  open: Record<CollapsibleFilter, boolean>;
  sort: {
    order: SortOrder;
    criteria: SortCriteria;
  };
};

export type DeckSortPayload = {
  order: SortOrder;
  criteria: SortCriteria;
};

export type DeckCollectionSlice = {
  deckCollection: DeckCollectionState;

  addDecksFilter<F extends DeckFiltersKey, T extends DeckFiltersValue<F>>(
    type: F,
    value: T,
  ): void;
  resetDeckFilter(filter: DeckFiltersKey): void;
  setDeckFilterOpen(filter: CollapsibleFilter, status: boolean): void;
  setDeckSort(payload: Partial<DeckSortPayload>): void;
  toggleFolderExpanded(folderId: string): void;
};

export type DeckPropertyName = "parallel";

export type SortCriteria =
  | "date_updated"
  | "date_created"
  | "alphabetical"
  | "xp";
