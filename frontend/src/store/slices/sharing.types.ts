import type { DeckDisplayType } from "@/components/deck-display/deck-display";
import type { Deck, Id } from "@/store/schemas/deck.schema";
import type { ResolvedDeck } from "../lib/types";

type SharingState = {
  decks: Record<string, string>; // <id, date_update>
};

export type SharingSlice = {
  sharing: SharingState;
  createShare: (id: string) => Promise<void>;
  deleteShare: (id: string) => Promise<void>;
  deleteAllShares: () => Promise<void>;
  importSharedDeck: (deck: ResolvedDeck, type: DeckDisplayType) => Promise<Id>;
  updateShare: (deck: Deck) => Promise<Id | undefined>;
};
