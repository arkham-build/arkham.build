import { createSelector } from "reselect";
import type { FanMadeProject } from "../lib/fan-made-content.schemas";
import type { StoreState } from "../slices";
import { selectLocaleSortingCollator } from "./shared";

export const selectOwnedFanMadeProjects = createSelector(
  (state: StoreState) => state.fanMadeData.projects,
  selectLocaleSortingCollator,
  (projects, collator) =>
    Object.values(projects).sort((a, b) =>
      collator.compare(a.meta.name, b.meta.name),
    ) as FanMadeProject[],
);
