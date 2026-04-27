import type { DeckDisplayType } from "@/components/deck-display/deck-display";
import type { Id } from "@/store/schemas/deck.schema";
import type { ResolvedDeck } from "../lib/types";

type SharingState = {
  decks: Record<string, string>; // <id, date_update>
};

export type SharingSlice = {
  sharing: SharingState;
  importSharedDeck: (deck: ResolvedDeck, type: DeckDisplayType) => Promise<Id>;
};
