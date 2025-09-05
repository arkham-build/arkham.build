import type { StoreState } from "@/store/slices";

function migrate(_state: unknown, version: number) {
  const state = _state as StoreState;

  if (version < 7) {
    state.data.folders ??= {};
    state.data.deckFolders ??= {};
  }

  return state;
}

export default migrate;
