import type { DeckId, StorageProvider } from "@arkham-build/shared";
import { isDeckConflictError } from "../services/requests/decks";
import type { StoreState } from "../slices";
import type { DeckSyncItemState } from "../slices/sync.types";

export function isStorageProviderAvailable(
  state: StoreState,
  provider: StorageProvider,
): boolean {
  switch (provider) {
    case undefined:
    case null:
    case "local":
      return true;
    case "remote":
      return state.auth.status === "authenticated";
    case "shared":
    case "arkhamdb":
      return false;
  }
}

export function isSyncedStorageProvider(provider: StorageProvider): boolean {
  return provider === "remote" || provider === "arkhamdb";
}

export function updateDeckSyncSuccess(
  sync: StoreState["sync"],
  deckId: DeckId,
  version: string,
  lastSyncedAt: number,
): StoreState["sync"] {
  return {
    ...sync,
    decks: {
      ...sync.decks,
      manifestVersion: null,
      status: "synced",
      error: null,
      items: updateDeckSyncItem(sync.decks.items, deckId, {
        version,
        status: "synced",
        lastSyncedAt,
        error: null,
        conflict: null,
      }),
    },
  };
}

export function updateDeckSyncSaving(
  sync: StoreState["sync"],
  deckId: DeckId,
): StoreState["sync"] {
  return {
    ...sync,
    decks: {
      ...sync.decks,
      items: updateDeckSyncItem(sync.decks.items, deckId, {
        status: "saving",
        error: null,
        conflict: null,
      }),
    },
  };
}

export function updateDeckSyncError(
  sync: StoreState["sync"],
  deckId: DeckId,
  error: unknown,
  kind: NonNullable<DeckSyncItemState["conflict"]>["kind"],
): StoreState["sync"] {
  if (isDeckConflictError(error)) {
    const remoteVersion =
      error.remote?.remoteVersion ?? error.remote?.remoteDeck?.version ?? null;

    return {
      ...sync,
      decks: {
        ...sync.decks,
        status: "conflict",
        items: updateDeckSyncItem(sync.decks.items, deckId, {
          status: "conflict",
          conflict: { kind, remoteVersion },
        }),
      },
    };
  }

  return {
    ...sync,
    decks: {
      ...sync.decks,
      status: "error",
      items: updateDeckSyncItem(sync.decks.items, deckId, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    },
  };
}

function updateDeckSyncItem(
  items: StoreState["sync"]["decks"]["items"],
  deckId: DeckId,
  payload: Partial<DeckSyncItemState>,
): StoreState["sync"]["decks"]["items"] {
  const item = items[deckId] ?? getInitialDeckSyncItem();
  return {
    ...items,
    [deckId]: {
      ...item,
      ...payload,
    },
  };
}

function getInitialDeckSyncItem(): DeckSyncItemState {
  return {
    version: null,
    status: "idle",
    lastSyncedAt: null,
    error: null,
    conflict: null,
  };
}
