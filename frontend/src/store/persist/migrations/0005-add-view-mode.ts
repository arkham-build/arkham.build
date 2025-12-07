import type { StoreState } from "@/store/slices";
import type { ListConfig } from "@/store/slices/settings.types";

function migrate(_state: unknown, version: number) {
  const state = _state as StoreState;

  if (version < 6) {
    for (const key of Object.keys(state.settings.lists)) {
      delete (
        state.settings.lists[
          key as keyof StoreState["settings"]["lists"]
          // biome-ignore lint/suspicious/noExplicitAny: safe.
        ] as any
      ).showCardText;

      (
        state.settings.lists[
          key as keyof StoreState["settings"]["lists"]
        ] as ListConfig
      ).viewMode = "compact";
    }
  }

  return state;
}

export default migrate;
