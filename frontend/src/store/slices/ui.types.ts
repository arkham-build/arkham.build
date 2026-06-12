import type {
  Deck,
  DeckFanMadeContent,
  FanMadeProject,
} from "@arkham-build/shared";

export type CardModalConfig = {
  listOrder?: string[];
};

export type CardModalState = {
  code: string | undefined;
  config: CardModalConfig | undefined;
};

export type UIState = {
  ui: {
    cardModal: CardModalState;
    fanMadeContentCache: Partial<DeckFanMadeContent>;
    initialized: boolean;
    keyboardShortcutsOpen: boolean;
    navigationHistory: string[];
    sessionInitialized: boolean;
    showLimitedAccess: boolean;
    showUnusableCards: boolean;
  };
};

export type UISlice = UIState & {
  setShowUnusableCards(value: boolean): void;
  setShowLimitedAccess(value: boolean): void;
  cacheFanMadeContent(decks: Deck[]): undefined;
  cacheFanMadeProject(content: FanMadeProject): void;
  uncacheFanMadeProject(content: FanMadeProject): void;

  toggleKeyboardShortcuts(): void;

  pushHistory(path: string): void;
  pruneHistory(index: number): void;

  openCardModal(code: string): void;
  closeCardModal(): void;
  setCardModalConfig(config: CardModalConfig): void;
};
