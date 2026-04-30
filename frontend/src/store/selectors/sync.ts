import { createSelector } from "reselect";
import type { Id } from "../schemas/deck.schema";
import type { StoreState } from "../slices";

export const selectDeckHasConflict = createSelector(
  (_: StoreState, id: Id) => String(id),
  (state: StoreState) => state.sync.decks.items,
  (id, items) => items[id]?.status === "conflict",
);
