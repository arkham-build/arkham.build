import { createSelector } from "reselect";
import type { StoreState } from "../slices";

export const selectOwnedFanMadeProjects = createSelector(
  (state: StoreState) => state.fanMadeData.projects,
  (projects) => Object.values(projects),
);
