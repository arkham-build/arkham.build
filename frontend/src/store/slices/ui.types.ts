import type { Deck } from "@/store/schemas/deck.schema";
import type { DeckFanMadeContent } from "../lib/types";

export type CardModalConfig = {
  listOrder?: string[];
};

export type CardModalState = {
  code: string | undefined;
  config: CardModalConfig | undefined;
};

export type UIState = {
  ui: {
    initialized: boolean;
    showUnusableCards: boolean;
    showLimitedAccess: boolean;
    fanMadeContentCache: Partial<DeckFanMadeContent>;
    navigationHistory: string[];
    cardModal: CardModalState;
  };
};

export type UISlice = UIState & {
  setShowUnusableCards(value: boolean): void;
  setShowLimitedAccess(value: boolean): void;
  cacheFanMadeContent(decks: Deck[]): undefined;

  pushHistory(path: string): void;
  pruneHistory(index: number): void;

  openCardModal(code: string): void;
  closeCardModal(): void;
  setCardModalConfig(config: CardModalConfig): void;
};
