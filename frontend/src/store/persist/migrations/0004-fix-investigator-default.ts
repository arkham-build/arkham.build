import type { StoreState } from "@/store/slices";
import { getInitialListsSetting } from "@/store/slices/settings";

function migrate(_state: unknown, version: number) {
  const state = _state as StoreState;

  if (version < 5) {
    if (state.settings?.lists?.investigator) {
      state.settings.lists.investigator = getInitialListsSetting().investigator;
    }
  }

  return state;
}

export default migrate;
