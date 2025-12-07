import { tryEnablePersistence } from "@/utils/persistence";
import { time, timeEnd } from "@/utils/time";
import type { StoreState } from "../slices";
import { migrate } from "./migrate";
import { makeStorageAdapter, VERSION } from "./storage";
import { TabSync } from "./tab-sync";

type AppState = Pick<
  StoreState,
  "app" | "connections" | "data" | "settings" | "sharing" | "fanMadeData"
>;

type StorageType = "app" | "edits" | "metadata";

type EditsState = Pick<StoreState, "deckEdits">;

type MetadataState = Pick<StoreState, "metadata">;

export const tabSync = new TabSync();

const metadataStorage = makeStorageAdapter<MetadataState>(
  "deckbuilder-metadata",
  (state) => ({
    metadata: state.metadata,
  }),
);

export const appStorage = makeStorageAdapter<AppState>(
  "deckbuilder-app",
  (state) => ({
    app: state.app,
    connections: state.connections,
    fanMadeData: state.fanMadeData,
    data: state.data,
    settings: state.settings,
    sharing: state.sharing,
  }),
);

const editsStorage = makeStorageAdapter<EditsState>(
  "deckbuilder-edits",
  (state) => ({
    deckEdits: state.deckEdits,
  }),
);

export async function hydrate() {
  const [metadataState, appState, editsState] = await Promise.all([
    metadataStorage.get(),
    appStorage.get(),
    editsStorage.get(),
  ]);

  if (!metadataState && !appState && !editsState) {
    return undefined;
  }

  const version = Math.min(
    metadataState?.version ?? VERSION,
    appState?.version ?? VERSION,
    editsState?.version ?? VERSION,
  );

  let state: Partial<StoreState> = {
    ...metadataState?.state,
    ...appState?.state,
    ...editsState?.state,
  };

  if (version !== VERSION) {
    state = migrate(state, version);
    await Promise.all([
      metadataStorage.set(state),
      appStorage.set(state),
      editsStorage.set(state),
    ]);
  }

  return state;
}

export async function dehydrate(
  state: StoreState,
  ...types: ("all" | StorageType)[]
) {
  time("dehydration");

  // Only ask for persistence when saving app data
  if (types.includes("app")) {
    tryEnablePersistence();
  }

  try {
    const partials = await Promise.all(
      types.reduce(
        (acc, t) => {
          if (t === "all" || t === "app") {
            acc.push(appStorage.set(state));
          }

          if (t === "all" || t === "edits") {
            acc.push(editsStorage.set(state));
          }

          if (t === "all" || t === "metadata") {
            acc.push(metadataStorage.set(state));
          }

          return acc;
        },
        [] as Promise<Partial<StoreState>>[],
      ),
    );

    try {
      tabSync.send(Object.assign({}, ...partials));
    } catch (err) {
      console.error("[tab-sync] failed:", err);
    }

    timeEnd("dehydration");
  } catch (err) {
    timeEnd("dehydration");
    throw err;
  }
}
