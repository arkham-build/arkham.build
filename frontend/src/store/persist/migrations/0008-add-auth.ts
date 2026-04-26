import type { StoreState } from "@/store/slices";

function migrate(_state: unknown, version: number) {
  const state = _state as StoreState;

  if (version < 9) {
    state.auth ??= { session: null, status: "idle" };
  }

  return state;
}

export default migrate;
