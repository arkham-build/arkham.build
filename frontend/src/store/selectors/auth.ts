import { createSelector } from "reselect";
import type { StoreState } from "../slices";

export const selectSession = createSelector(
  (state: StoreState) => state.auth,
  (auth) => auth.session,
);
