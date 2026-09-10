import { removeRemoteAccountDecks } from "@/store/lib/sync-reconciliation";
import type { StoreState } from "@/store/slices";

export type LegacyState = Partial<StoreState> & {
  connections?: unknown;
  remoting?: unknown;
  sharing?: {
    decks?: Record<string, string>;
  };
};

function migrate(_state: unknown, version: number) {
  const state = _state as LegacyState;

  if (version < 10) {
    const migrationNeeded = hasLegacyAccountDeck(state);

    removeLegacyArkhamDbDecks(state);
    localizeSharedDecks(state);

    if (migrationNeeded) {
      markAccountMigrationNeeded(state);
    }

    delete state.connections;
    delete state.remoting;
    delete state.sharing;
  }

  return state;
}

function hasLegacyAccountDeck(state: LegacyState) {
  if (!state.data) {
    return false;
  }

  const sharedDeckIds = new Set(Object.keys(state.sharing?.decks ?? {}));

  return Object.values(state.data.decks ?? {}).some(
    (deck) =>
      deck.source === "arkhamdb" ||
      deck.source === "shared" ||
      sharedDeckIds.has(String(deck.id)),
  );
}

function markAccountMigrationNeeded(state: LegacyState) {
  state.settings ??= {} as StoreState["settings"];
  state.settings.flags = {
    ...state.settings.flags,
    migrationNeeded: true,
  };
}

function removeLegacyArkhamDbDecks(state: LegacyState) {
  if (!state.data) {
    return;
  }

  state.deckEdits ??= {};
  state.data.deckFolders ??= {};
  state.data.folders ??= {};
  state.data.history ??= {};

  const result = removeRemoteAccountDecks(
    {
      data: state.data,
      deckEdits: state.deckEdits,
    },
    { preserveDeckFolders: true },
  );

  state.data = result.data;
  state.deckEdits = result.deckEdits;
}

function localizeSharedDecks(state: LegacyState) {
  if (!state.data) {
    return;
  }

  const sharedDeckIds = new Set(Object.keys(state.sharing?.decks ?? {}));

  for (const [id, deck] of Object.entries(state.data.decks ?? {})) {
    if (deck.source === "shared" || sharedDeckIds.has(String(deck.id))) {
      state.data.decks[id] = {
        ...deck,
        source: "local",
      };
    }
  }
}

export default migrate;
