import type { StoreState } from "../slices";
import { migrate } from "./migrate";
import { VERSION, makeStorageAdapter } from "./storage";

type AppState = Pick<
  StoreState,
  "app" | "connections" | "data" | "settings" | "sharing" | "fanMadeData"
>;

type EditsState = Pick<StoreState, "deckEdits">;

type MetadataState = Pick<StoreState, "metadata">;

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

export const editsStorage = makeStorageAdapter<EditsState>(
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

export function dehydrateMetadata(state: StoreState) {
  return metadataStorage.set(state);
}

export function dehydrateApp(state: StoreState) {
  return appStorage.set(state);
}

export function dehydrateEdits(state: StoreState) {
  return editsStorage.set(state);
}
