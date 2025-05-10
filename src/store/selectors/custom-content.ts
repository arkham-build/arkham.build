import { createSelector } from "reselect";
import type { StoreState } from "../slices";

export const selectOwnedCustomProjects = createSelector(
  (state: StoreState) => state.customData.projects,
  (projects) => Object.values(projects),
);
