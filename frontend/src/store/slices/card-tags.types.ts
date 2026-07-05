import type { CardTagsState } from "@arkham-build/shared";

export type CardTagsSliceState = {
  cardTags: CardTagsState;
};

export type CardTagsSlice = CardTagsSliceState & {
  applyCardTagsState(state: CardTagsState): Promise<void>;
  createCardTag(name: string): Promise<string>;
  deleteCardTag(id: string): Promise<void>;
  renameCardTag(id: string, name: string): Promise<void>;
  tagCard(cardCode: string, tagId: string): Promise<void>;
  toggleFavorite(cardCode: string): Promise<void>;
  untagCard(cardCode: string, tagId: string): Promise<void>;
};
