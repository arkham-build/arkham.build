import type { GroupingType, SortingType, ViewMode } from "./lists.types";

export type ListConfig = {
  group: GroupingType[];
  sort: SortingType[];
  viewMode: ViewMode;
};

export type DecklistConfig = {
  group: GroupingType[];
  sort: SortingType[];
};

export type Locale = string;

export type SettingsState = {
  cardLevelDisplay: "icon-only" | "dots" | "text";
  cardShowCollectionNumber?: boolean;
  cardSkillIconsDisplay: "simple" | "as_printed";
  collection: Record<string, number>; // track as "quantity" owned to accomodate the core set.
  flags?: Record<string, boolean>;
  fontSize: number;
  hideWeaknessesByDefault: boolean;
  lists: {
    encounter: ListConfig;
    investigator: ListConfig;
    player: ListConfig;
    deck: DecklistConfig;
    deckScans: DecklistConfig;
  };
  locale: Locale;
  showAllCards: boolean;
  showMoveToSideDeck: boolean;
  showPreviews: boolean;
  tabooSetId: number | undefined;
  sortIgnorePunctuation: boolean;
  useLimitedPoolForWeaknessDraw: boolean;
};

export type SettingsSlice = {
  settings: SettingsState;
} & {
  toggleFlag(key: string): Promise<void>;
  updateSettings: (payload: SettingsState) => Promise<void>;
};
