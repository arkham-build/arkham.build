import type { CardTagsState } from "@arkham-build/shared";

export type CardTagsSliceState = {
  cardTags: CardTagsState;
};

export type CardTagsSlice = CardTagsSliceState & {
  applyCardTagsState(state: CardTagsState): Promise<void>;
  createCardTagForCard(cardCode: string, name: string): Promise<string>;
  deleteCardTag(id: string): Promise<void>;
  renameCardTag(id: string, name: string): Promise<void>;
  setCardTagsForCard(cardCode: string, tagIds: string[]): Promise<void>;
  toggleFavorite(cardCode: string): Promise<void>;
};
