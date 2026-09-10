import type {
  Deck,
  DeckId,
  DeckManifestResponse,
  DeckSyncTarget,
  Id,
  SyncedDeckProvider,
} from "@arkham-build/shared";
import type { StoreState } from "../slices";
import type {
  DeckSyncItemState,
  DecksSyncState,
  SyncStatus,
} from "../slices/sync.types";
import { isSyncedStorageProvider } from "./sync";

const SKIPPED_ITEM_STATUSES = new Set<SyncStatus>(["saving", "conflict"]);

type DataState = StoreState["data"];
type DeckEditsState = StoreState["deckEdits"];

type DeckReconciliationPlan = {
  fetchTargets: DeckSyncTarget[];
  removeIds: Id[];
  skippedIds: Id[];
};

type DeckReconciliationInput = {
  accountId: string;
  data: DataState;
  deckEdits: DeckEditsState;
  manifest: DeckManifestResponse;
  plan: DeckReconciliationPlan;
  remoteDecks: Deck[];
  syncDecks: DecksSyncState;
};

type DeckReconciliationResult = {
  data: DataState;
  deckEdits: DeckEditsState;
  syncDecks: DecksSyncState;
};

type RemoveRemoteAccountDecksOptions = {
  preserveDeckFolders?: boolean;
  providers?: readonly SyncedDeckProvider[];
};

export function removeRemoteAccountDecks(
  { data, deckEdits }: Pick<StoreState, "data" | "deckEdits">,
  {
    preserveDeckFolders = false,
    providers = ["account", "arkhamdb"],
  }: RemoveRemoteAccountDecksOptions = {},
) {
  const providerSet = new Set(providers);
  const remoteDeckIdKeys = new Set<string>();

  for (const deck of Object.values(data.decks)) {
    if (isSyncedStorageProvider(deck.source) && providerSet.has(deck.source)) {
      remoteDeckIdKeys.add(deckIdKey(deck.id));
    }
  }

  if (!remoteDeckIdKeys.size) {
    return { data, deckEdits };
  }

  const nextDecks: DataState["decks"] = {};

  for (const [id, deck] of Object.entries(data.decks)) {
    if (!remoteDeckIdKeys.has(deckIdKey(deck.id))) {
      nextDecks[id] = deck;
    }
  }

  const nextDeckFolders = preserveDeckFolders
    ? data.deckFolders
    : { ...data.deckFolders };
  const nextDeckEdits = { ...deckEdits };
  const nextUndoHistory = data.undoHistory
    ? { ...data.undoHistory }
    : undefined;

  for (const id of remoteDeckIdKeys) {
    if (!preserveDeckFolders) {
      delete nextDeckFolders[id];
    }

    delete nextDeckEdits[id];
    delete nextUndoHistory?.[id];
  }

  const sanitizedDecks = sanitizeDeckLinks(nextDecks);

  return {
    data: {
      ...data,
      decks: sanitizedDecks,
      deckFolders: nextDeckFolders,
      history: rebuildDeckHistory(sanitizedDecks),
      undoHistory: nextUndoHistory,
    },
    deckEdits: nextDeckEdits,
  };
}

export function getDeckReconciliationPlan({
  data,
  manifest,
  syncDecks,
}: {
  data: DataState;
  manifest: DeckManifestResponse;
  syncDecks: DecksSyncState;
}): DeckReconciliationPlan {
  const fetchTargets: DeckSyncTarget[] = [];
  const skippedIdKeys = new Set<string>();
  const manifestIdKeys = new Set(
    manifest.decks.map((item) => deckIdKey(item.id)),
  );

  for (const item of manifest.decks) {
    const idKey = deckIdKey(item.id);
    const syncItem = syncDecks.items[idKey];

    if (shouldSkipSyncItem(syncItem)) {
      skippedIdKeys.add(idKey);
      continue;
    }

    if (!data.decks[idKey] || !syncItem || syncItem.version !== item.version) {
      fetchTargets.push({ provider: item.provider, id: item.id });
    }
  }

  const removeIds = Object.keys(syncDecks.items).reduce<Id[]>((acc, id) => {
    const idKey = deckIdKey(id);
    const deck = data.decks[idKey];

    if (deck?.source === "arkhamdb" && !manifest.providers.arkhamdb.available) {
      skippedIdKeys.add(idKey);
      return acc;
    }

    if (manifestIdKeys.has(idKey)) return acc;

    const item = syncDecks.items[idKey];

    if (shouldSkipSyncItem(item)) {
      skippedIdKeys.add(idKey);
      return acc;
    }

    acc.push(id);
    return acc;
  }, []);

  return {
    fetchTargets,
    removeIds,
    skippedIds: Array.from(skippedIdKeys),
  };
}

export function applyRemoteDeckReconciliation({
  accountId,
  data,
  deckEdits,
  manifest,
  plan,
  remoteDecks,
  syncDecks,
}: DeckReconciliationInput): DeckReconciliationResult {
  const now = Date.now();
  const skippedIdKeys = new Set(plan.skippedIds.map(deckIdKey));

  const nextDecks = { ...data.decks };
  const nextDeckFolders = { ...data.deckFolders };
  const nextDeckEdits = { ...deckEdits };
  const nextItems = { ...syncDecks.items };
  const nextUndoHistory = data.undoHistory
    ? { ...data.undoHistory }
    : undefined;

  for (const id of plan.removeIds) {
    const idKey = deckIdKey(id);
    const item = nextItems[idKey];

    if (shouldSkipSyncItem(item)) {
      skippedIdKeys.add(idKey);
      continue;
    }

    delete nextDecks[idKey];
    delete nextItems[idKey];
    delete nextDeckEdits[idKey];
    delete nextDeckFolders[idKey];
    delete nextUndoHistory?.[idKey];
  }

  for (const deck of remoteDecks) {
    const idKey = deckIdKey(deck.id);
    const item = nextItems[idKey];

    if (shouldSkipSyncItem(item)) {
      skippedIdKeys.add(idKey);
      continue;
    }

    nextDecks[idKey] = { ...deck, source: deck.source };
    nextItems[idKey] = makeSyncedItem(deck.version, now, item);
    delete nextUndoHistory?.[idKey];
  }

  for (const item of manifest.decks) {
    const idKey = deckIdKey(item.id);
    const syncItem = nextItems[idKey];

    if (skippedIdKeys.has(idKey)) continue;

    if (shouldSkipSyncItem(syncItem)) {
      skippedIdKeys.add(idKey);
      continue;
    }

    if (!nextDecks[idKey]) continue;
    nextItems[idKey] = makeSyncedItem(item.version, now, syncItem);
  }

  const sanitizedDecks = sanitizeDeckLinks(nextDecks);

  return {
    data: {
      ...data,
      decks: sanitizedDecks,
      deckFolders: nextDeckFolders,
      history: rebuildDeckHistory(sanitizedDecks),
      undoHistory: nextUndoHistory,
    },
    deckEdits: nextDeckEdits,
    syncDecks: {
      ...syncDecks,
      accountId,
      manifestVersion: skippedIdKeys.size
        ? syncDecks.manifestVersion
        : manifest.version,
      lastSyncedAt: now,
      status: getReconciliationStatus(skippedIdKeys, nextItems),
      error: null,
      items: nextItems,
    },
  };
}

export function hasUnsettledDeckSyncItems(syncDecks: DecksSyncState) {
  return Object.values(syncDecks.items).some(shouldSkipSyncItem);
}

function makeSyncedItem(
  version: string,
  lastSyncedAt: number,
  item: DeckSyncItemState | undefined,
): DeckSyncItemState {
  return {
    ...item,
    version,
    status: "synced",
    lastSyncedAt,
    error: null,
    conflict: null,
  };
}

function getReconciliationStatus(
  skippedIdKeys: Set<string>,
  items: Record<string, DeckSyncItemState>,
): SyncStatus {
  if (!skippedIdKeys.size) return "synced";

  for (const id of skippedIdKeys) {
    if (items[id]?.status === "conflict") return "conflict";
  }

  return "partial";
}

export function rebuildDeckHistory(decks: Record<DeckId, Deck>) {
  const decksByIdKey = getDecksByIdKey(decks);
  const previousIdKeys = new Set<string>();

  for (const deck of Object.values(decks)) {
    if (
      deck.previous_deck != null &&
      decksByIdKey.has(deckIdKey(deck.previous_deck))
    ) {
      previousIdKeys.add(deckIdKey(deck.previous_deck));
    }
  }

  const latestIds = Object.values(decks)
    .filter((deck) => {
      const hasKnownNextDeck =
        deck.next_deck != null && decksByIdKey.has(deckIdKey(deck.next_deck));
      return !previousIdKeys.has(deckIdKey(deck.id)) && !hasKnownNextDeck;
    })
    .map((deck) => deck.id);

  const history: DataState["history"] = {};

  for (const latestId of latestIds) {
    history[latestId] = collectPreviousDeckIds(decksByIdKey, latestId);
  }

  for (const deck of Object.values(decks)) {
    if (!history[deck.id] && !previousIdKeys.has(deckIdKey(deck.id))) {
      history[deck.id] = [];
    }
  }

  return history;
}

function collectPreviousDeckIds(
  decksByIdKey: Map<string, Deck>,
  latestId: DeckId,
) {
  const history: Id[] = [];
  const seenIdKeys = new Set<string>([deckIdKey(latestId)]);
  let current = decksByIdKey.get(deckIdKey(latestId));

  while (current?.previous_deck != null) {
    const previousId = current.previous_deck;
    const previousIdKey = deckIdKey(previousId);

    if (seenIdKeys.has(previousIdKey) || !decksByIdKey.has(previousIdKey)) {
      break;
    }

    history.push(previousId);
    seenIdKeys.add(previousIdKey);
    current = decksByIdKey.get(previousIdKey);
  }

  return history;
}

function sanitizeDeckLinks(decks: Record<DeckId, Deck>) {
  const decksByIdKey = getDecksByIdKey(decks);
  const previousByDeckId = new Map<string, DeckId>();
  const nextByDeckId = new Map<string, DeckId>();

  for (const deck of Object.values(decks)) {
    if (
      deck.previous_deck != null &&
      decksByIdKey.has(deckIdKey(deck.previous_deck))
    ) {
      previousByDeckId.set(deckIdKey(deck.id), deck.previous_deck);
      nextByDeckId.set(deckIdKey(deck.previous_deck), deck.id);
    }

    if (deck.next_deck != null && decksByIdKey.has(deckIdKey(deck.next_deck))) {
      nextByDeckId.set(deckIdKey(deck.id), deck.next_deck);
      previousByDeckId.set(deckIdKey(deck.next_deck), deck.id);
    }
  }

  return Object.fromEntries(
    Object.entries(decks).map(([id, deck]) => [
      id,
      {
        ...deck,
        previous_deck: previousByDeckId.get(deckIdKey(deck.id)) ?? null,
        next_deck: nextByDeckId.get(deckIdKey(deck.id)) ?? null,
      },
    ]),
  );
}

function getDecksByIdKey(decks: Record<DeckId, Deck>) {
  return new Map(
    Object.values(decks).map((deck) => [deckIdKey(deck.id), deck]),
  );
}

function deckIdKey(id: DeckId) {
  return String(id);
}

function shouldSkipSyncItem(item: DeckSyncItemState | undefined) {
  return item ? SKIPPED_ITEM_STATUSES.has(item.status) : false;
}
