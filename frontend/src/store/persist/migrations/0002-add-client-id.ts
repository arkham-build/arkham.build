import type { StoreState } from "@/store/slices";
import { randomId } from "@/utils/crypto";

function migrate(_state: unknown, version: number) {
  const state = _state as StoreState;

  if (version < 3) {
    if (!state.app?.clientId) {
      state.app ??= {} as StoreState["app"];
      state.app.clientId = randomId();
    }

    if (
      !state.settings.showAllCards &&
      Object.keys(state.settings.collection).length === 0
    ) {
      state.settings.showAllCards = true;
    }
  }
}

export default migrate;
