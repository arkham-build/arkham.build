import type { Id } from "../schemas/deck.schema";

export type RecommenderState = {
  recommender: {
    includeSideDeck: boolean;
    isRelative: boolean;
    deckFilter: [string, string];
    coreCards: { [id: Id]: string[] };
  };
};

export type RecommenderSlice = RecommenderState & {
  setIncludeSideDeck(value: boolean): void;
  setIsRelative(value: boolean): void;
  setRecommenderDeckFilter(value: [string, string]): void;
  addCoreCard(deck: Id, value: string): void;
  removeCoreCard(deck: Id, value: string): void;
};
