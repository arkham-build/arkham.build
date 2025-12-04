import type { StoreState } from "@/store/slices";
import { getInitialListsSetting } from "@/store/slices/settings";

function migrate(_state: unknown, version: number) {
  const state = _state as StoreState;

  if (version < 4) {
    if (!state.settings.lists) {
      state.settings.lists = getInitialListsSetting();
    }
  }

  return state;
}

export default migrate;
