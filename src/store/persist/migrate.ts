import type { StoreState } from "../slices";
import v1Tov2 from "./migrations/0001-add-deck-history";
import v2Tov3 from "./migrations/0002-add-client-id";
import v3Tov4 from "./migrations/0003-add-lists-setting";
import v4Tov5 from "./migrations/0004-fix-investigator-default";
import v5Tov6 from "./migrations/0005-add-view-mode";
import v6Tov7 from "./migrations/0006-add-folders";

export function migrate(
  persisted: Partial<StoreState>,
  version: number,
): Partial<StoreState> {
  const state = structuredClone(persisted);

  if (version < 2) {
    console.debug("[persist] migrate store: ", 2);
    v1Tov2(state, version);
  }

  if (version < 3) {
    console.debug("[persist] migrate store: ", 3);
    v2Tov3(state, version);
  }

  if (version < 4) {
    console.debug("[persist] migrate store: ", 4);
    v3Tov4(state, version);
  }

  if (version < 5) {
    console.debug("[persist] migrate store: ", 5);
    v4Tov5(state, version);
  }

  if (version < 6) {
    console.debug("[persist] migrate store: ", 6);
    v5Tov6(state, version);
  }

  if (version < 7) {
    console.debug("[persist] migrate store: ", 7);
    v6Tov7(state, version);
  }

  return state;
}
