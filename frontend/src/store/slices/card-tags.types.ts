import type { CardTagsState } from "@arkham-build/shared";

export type CardTagsSliceState = {
  cardTags: CardTagsState;
};

export type CardTagsSlice = CardTagsSliceState & {
  applyCardTagsState(state: CardTagsState): Promise<void>;
  createCardTag(name: string): Promise<string>;
  createCardTagForCard(cardCode: string, name: string): Promise<string>;
  deleteCardTag(name: string): Promise<void>;
  renameCardTag(name: string, nextName: string): Promise<void>;
  setCardTagsForCard(cardCode: string, tagNames: string[]): Promise<void>;
  toggleFavorite(cardCode: string): Promise<void>;
};
