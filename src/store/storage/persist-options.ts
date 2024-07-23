import type {
  PersistOptions,
  PersistStorage,
  StorageValue,
} from "zustand/middleware";

import { time, timeEnd } from "@/utils/time";
import type { StoreState } from "../slices";
import { getInitialAppState } from "../slices/app";
import { getInitialDataState } from "../slices/data";
import { getInitialMetadata } from "../slices/metadata";
import { getInitialSettings } from "../slices/settings";
import { getInitialSharingState } from "../slices/sharing";
import v1Tov2 from "./migrations/0001-add-deck-history";
import v2Tov3 from "./migrations/0002-add-client-id";
import { StorageAdapter } from "./storage-adapter";
import type { Val } from "./storage.types";

const storageAdapter = new StorageAdapter();

const VERSION = 3;

// use this flag to disable rehydration during dev.
const SKIP_HYDRATION = false;

export const storageConfig: PersistOptions<StoreState, Val> = {
  name: "deckbuilder",
  storage: createCustomStorage(),
  version: VERSION,
  skipHydration: import.meta.env.MODE === "test",
  migrate(persisted, version) {
    const state = persisted as StoreState;

    if (version < 2) {
      console.debug("[persist] migrate store: ", version);
      v1Tov2(state, version);
    }

    if (version < 3) {
      console.debug("[persist] migrate store: ", version);
      v2Tov3(state, version);
    }

    return state;
  },
  partialize(state: StoreState) {
    return {
      app: state.app,
      data: state.data,
      deckEdits: state.deckEdits,
      metadata: state.metadata,
      settings: state.settings,
      sharing: state.sharing,
    };
  },
  onRehydrateStorage: () => {
    time("hydration");
    return (state: StoreState | undefined, error?: unknown) => {
      if (state) state.setHydrated();
      if (error) console.error(error);
      timeEnd("hydration");
    };
  },
};

function createCustomStorage(): PersistStorage<Val> | undefined {
  return {
    async getItem(name) {
      if (SKIP_HYDRATION) return null;

      try {
        const [metadata, appdata] = await Promise.all([
          storageAdapter.getMetadata(name),
          storageAdapter.getAppdata(name),
        ]);

        if (!metadata && !appdata) return null;

        const val: StorageValue<Val> = {
          state: {
            app: appdata?.state?.app ?? getInitialAppState(),
            data: appdata?.state?.data ?? getInitialDataState().data,
            deckEdits: appdata?.state?.deckEdits ?? {},
            metadata: metadata?.state?.metadata ?? getInitialMetadata(),
            settings: appdata?.state?.settings ?? getInitialSettings(),
            sharing: appdata?.state?.sharing ?? getInitialSharingState(),
          },
          version: Math.min(metadata?.version ?? 1, appdata?.version ?? 1),
        };

        return val;
      } catch (err) {
        storageAdapter.removeIdentifier(name);
        console.error("error during hydration:", err);
        return null;
      }
    },

    async setItem(name, value) {
      try {
        await storageAdapter.setAppdata(name, value);
        await storageAdapter.setMetadata(name, value);
      } catch (err) {
        console.error("could not persist store data:", err);
      }
    },

    async removeItem(name) {
      await Promise.all([
        storageAdapter.removeAppdata(name),
        storageAdapter.removeMetadata(name),
      ]);
    },
  };
}
