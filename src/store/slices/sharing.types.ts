import type { ResolvedDeck } from "../lib/types";
import type { Deck, Id } from "./data.types";

export type SharingState = {
  decks: Record<string, string>; // <id, date_update>
};

export type SharingSlice = {
  sharing: SharingState;
  createShare: (id: string) => Promise<void>;
  deleteShare: (id: string) => Promise<void>;
  deleteAllShares: () => Promise<void>;
  importSharedDeck: (deck: ResolvedDeck) => Id;
  updateShare: (deck: Deck) => Promise<Id | undefined>;
};
