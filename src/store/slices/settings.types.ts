import type { CardFormat } from "@/pages/deck-edit/editor/notes-rte/cards-to-markdown";
import type { CardOrigin } from "@/pages/deck-edit/editor/notes-rte/notes-rte-context";
import type {
  FanMadeContentFilter,
  GroupingType,
  SortingType,
  ViewMode,
} from "./lists.types";

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
  cardListsDefaultContentType: FanMadeContentFilter;
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
  notesEditor: {
    defaultFormat: CardFormat;
    defaultOrigin: CardOrigin;
  };
  showAllCards: boolean;
  showMoveToSideDeck: boolean;
  showPreviews: boolean;
  sortIgnorePunctuation: boolean;
  tabooSetId: number | undefined;
  useLimitedPoolForWeaknessDraw: boolean;
};

export type SettingsSlice = {
  settings: SettingsState;
} & {
  toggleFlag(key: string): Promise<void>;
  /**
   * Updates settings and refreshes application state. (lookup tables, locales)
   */
  applySettings: (payload: SettingsState) => Promise<void>;
  setSettings(payload: Partial<SettingsState>): Promise<void>;
};
