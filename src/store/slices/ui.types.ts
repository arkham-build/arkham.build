import type { DeckMeta } from "../lib/types";
import type { Deck } from "./data.types";

export type UIState = {
  ui: {
    initialized: boolean;
    showUnusableCards: boolean;
    showLimitedAccess: boolean;
    fanMadeContentCache: Partial<DeckMeta["fan_made_content"]>;
  };
};

export type UISlice = UIState & {
  setShowUnusableCards(value: boolean): void;
  setShowLimitedAccess(value: boolean): void;
  cacheFanMadeContent(deck: Deck): undefined;
};
