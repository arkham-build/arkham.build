import {
  type DeckId,
  isArkhamDBIdentity,
  type StorageProvider,
  type SyncedDeckProvider,
} from "@arkham-build/shared";
import { isDeckConflictError } from "../services/requests/decks";
import type { StoreState } from "../slices";
import type { DeckSyncItemState, SyncStatus } from "../slices/sync.types";

export function hasHealthyArkhamDBIdentity(auth: StoreState["auth"]) {
  if (auth.status !== "authenticated") return false;

  return (
    auth.session?.identities.find(isArkhamDBIdentity)?.details.status ===
    "healthy"
  );
}

export function isStorageProviderAvailable(
  state: StoreState,
  provider: StorageProvider,
): boolean {
  switch (provider) {
    case undefined:
    case null:
    case "local":
      return true;
    case "account":
      return state.auth.status === "authenticated";
    case "arkhamdb":
      return hasHealthyArkhamDBIdentity(state.auth);
    case "shared":
      return false;
  }
}

export function isSyncedStorageProvider(
  provider: StorageProvider,
): provider is SyncedDeckProvider {
  return provider === "account" || provider === "arkhamdb";
}

export function updateDeckSyncSuccess(
  sync: StoreState["sync"],
  deckId: DeckId,
  version: string,
  lastSyncedAt: number,
): StoreState["sync"] {
  const items = updateDeckSyncItem(sync.decks.items, deckId, {
    version,
    status: "synced",
    lastSyncedAt,
    error: null,
    conflict: null,
  });

  return {
    ...sync,
    decks: {
      ...sync.decks,
      manifestVersion: null,
      status: getDecksSyncStatus(items),
      error: null,
      items,
    },
  };
}

export function updateDeckSyncSaving(
  sync: StoreState["sync"],
  deckId: DeckId,
): StoreState["sync"] {
  const items = updateDeckSyncItem(sync.decks.items, deckId, {
    status: "saving",
    error: null,
    conflict: null,
  });

  return {
    ...sync,
    decks: {
      ...sync.decks,
      status: getDecksSyncStatus(items),
      items,
    },
  };
}

export function replaceDeckSyncItems(
  sync: StoreState["sync"],
  items: StoreState["sync"]["decks"]["items"],
): StoreState["sync"] {
  return {
    ...sync,
    decks: {
      ...sync.decks,
      manifestVersion: null,
      status: getDecksSyncStatus(items),
      error: null,
      items,
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
    const items = updateDeckSyncItem(sync.decks.items, deckId, {
      status: "conflict",
      error: null,
      conflict: {
        kind,
        remoteVersion,
      },
    });

    return {
      ...sync,
      decks: {
        ...sync.decks,
        status: getDecksSyncStatus(items),
        items,
      },
    };
  }

  const items = updateDeckSyncItem(sync.decks.items, deckId, {
    status: "error",
    error: error instanceof Error ? error.message : "Unknown error",
  });

  return {
    ...sync,
    decks: {
      ...sync.decks,
      status: getDecksSyncStatus(items),
      items,
    },
  };
}

export function updateDeckSyncConflictError(
  sync: StoreState["sync"],
  deckId: DeckId,
  error: unknown,
  kind: NonNullable<DeckSyncItemState["conflict"]>["kind"],
): StoreState["sync"] {
  const current = sync.decks.items[deckId] ?? getInitialDeckSyncItem();

  if (isDeckConflictError(error)) {
    return updateDeckSyncError(sync, deckId, error, kind);
  }

  const items = updateDeckSyncItem(sync.decks.items, deckId, {
    ...current,
    status: "conflict",
    error: error instanceof Error ? error.message : "Unknown error",
    conflict: current.conflict ?? { kind, remoteVersion: null },
  });

  return {
    ...sync,
    decks: {
      ...sync.decks,
      status: getDecksSyncStatus(items),
      items,
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

const DECK_SYNC_STATUS_PRIORITY: Record<SyncStatus, number> = {
  idle: 0,
  synced: 1,
  partial: 2,
  saving: 3,
  loading: 4,
  error: 5,
  conflict: 6,
};

function getDecksSyncStatus(items: StoreState["sync"]["decks"]["items"]) {
  let status: SyncStatus = "synced";

  for (const item of Object.values(items)) {
    if (
      DECK_SYNC_STATUS_PRIORITY[item.status] > DECK_SYNC_STATUS_PRIORITY[status]
    ) {
      status = item.status;
    }
  }

  return status;
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
