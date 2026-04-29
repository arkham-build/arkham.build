import type { DeckId, DeckManifestResponse } from "@arkham-build/shared";
import type { Deck, Id } from "../schemas/deck.schema";
import type { StoreState } from "../slices";
import type {
  DeckSyncItemState,
  DecksSyncState,
  SyncStatus,
} from "../slices/sync.types";

const SKIPPED_ITEM_STATUSES = new Set<SyncStatus>(["saving", "conflict"]);

type DataState = StoreState["data"];
type DeckEditsState = StoreState["deckEdits"];

type DeckReconciliationPlan = {
  fetchIds: DeckId[];
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

export function getDeckReconciliationPlan({
  data,
  manifest,
  syncDecks,
}: {
  data: DataState;
  manifest: DeckManifestResponse;
  syncDecks: DecksSyncState;
}): DeckReconciliationPlan {
  const fetchIds: DeckId[] = [];
  const skippedIds = new Set<Id>();

  for (const item of manifest.decks) {
    const syncItem = syncDecks.items[item.id];

    if (shouldSkipSyncItem(syncItem)) {
      skippedIds.add(item.id);
      continue;
    }

    if (
      !data.decks[item.id] ||
      !syncItem ||
      syncItem.version !== item.version
    ) {
      fetchIds.push(item.id);
    }
  }

  const removeIds = Object.keys(syncDecks.items).reduce<Id[]>((acc, id) => {
    if (manifestHasDeckId(manifest, id)) return acc;

    const item = syncDecks.items[id];

    if (shouldSkipSyncItem(item)) {
      skippedIds.add(id);
      return acc;
    }

    acc.push(id);
    return acc;
  }, []);

  return {
    fetchIds,
    removeIds,
    skippedIds: Array.from(skippedIds),
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
  const skippedIds = new Set<DeckId>(plan.skippedIds);

  const nextDecks = { ...data.decks };
  const nextDeckFolders = { ...data.deckFolders };
  const nextDeckEdits = { ...deckEdits };
  const nextItems = { ...syncDecks.items };
  const nextUndoHistory = data.undoHistory
    ? { ...data.undoHistory }
    : undefined;

  for (const id of plan.removeIds) {
    const item = nextItems[id];

    if (shouldSkipSyncItem(item)) {
      skippedIds.add(id);
      continue;
    }

    delete nextDecks[id];
    delete nextItems[id];
    delete nextDeckEdits[id];
    delete nextDeckFolders[id];
    delete nextUndoHistory?.[id];
  }

  for (const deck of remoteDecks) {
    const item = nextItems[deck.id];

    if (shouldSkipSyncItem(item)) {
      skippedIds.add(deck.id);
      continue;
    }

    nextDecks[deck.id] = deck;
    nextItems[deck.id] = makeSyncedItem(deck.version, now, item);
    delete nextUndoHistory?.[deck.id];
  }

  for (const item of manifest.decks) {
    const syncItem = nextItems[item.id];

    if (hasDeckId(skippedIds, item.id)) continue;

    if (shouldSkipSyncItem(syncItem)) {
      skippedIds.add(item.id);
      continue;
    }

    if (!nextDecks[item.id]) continue;
    nextItems[item.id] = makeSyncedItem(item.version, now, syncItem);
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
      manifestVersion: skippedIds.size
        ? syncDecks.manifestVersion
        : manifest.version,
      lastSyncedAt: now,
      status: getReconciliationStatus(skippedIds, nextItems),
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
  skippedIds: Set<DeckId>,
  items: Record<DeckId, DeckSyncItemState>,
): SyncStatus {
  if (!skippedIds.size) return "synced";

  for (const id of skippedIds) {
    if (items[id]?.status === "conflict") return "conflict";
  }

  return "saving";
}

export function rebuildDeckHistory(decks: Record<DeckId, Deck>) {
  const previousIds = new Set<DeckId>();

  for (const deck of Object.values(decks)) {
    if (deck.previous_deck != null && decks[deck.previous_deck]) {
      previousIds.add(deck.previous_deck);
    }
  }

  const latestIds = Object.values(decks)
    .filter((deck) => {
      const hasKnownNextDeck =
        deck.next_deck != null && decks[deck.next_deck] != null;
      return !hasDeckId(previousIds, deck.id) && !hasKnownNextDeck;
    })
    .map((deck) => deck.id);

  const history: DataState["history"] = {};

  for (const latestId of latestIds) {
    history[latestId] = collectPreviousDeckIds(decks, latestId);
  }

  for (const deck of Object.values(decks)) {
    if (!history[deck.id] && !hasDeckId(previousIds, deck.id)) {
      history[deck.id] = [];
    }
  }

  return history;
}

function collectPreviousDeckIds(decks: Record<DeckId, Deck>, latestId: DeckId) {
  const history: Id[] = [];
  const seen = new Set<DeckId>([latestId]);
  let current = decks[latestId];

  while (current?.previous_deck != null) {
    const previousId = current.previous_deck;

    if (hasDeckId(seen, previousId) || !decks[previousId]) break;

    history.push(previousId);
    seen.add(previousId);
    current = decks[previousId];
  }

  return history;
}

function sanitizeDeckLinks(decks: Record<DeckId, Deck>) {
  return Object.fromEntries(
    Object.entries(decks).map(([id, deck]) => [
      id,
      {
        ...deck,
        previous_deck:
          deck.previous_deck != null && decks[deck.previous_deck]
            ? deck.previous_deck
            : null,
        next_deck:
          deck.next_deck != null && decks[deck.next_deck]
            ? deck.next_deck
            : null,
      },
    ]),
  );
}

function manifestHasDeckId(manifest: DeckManifestResponse, id: DeckId) {
  return manifest.decks.some((item) => deckIdsMatch(item.id, id));
}

function hasDeckId(ids: Set<DeckId>, id: DeckId) {
  for (const candidate of ids) {
    if (deckIdsMatch(candidate, id)) return true;
  }

  return false;
}

function deckIdsMatch(a: DeckId, b: DeckId) {
  return a === b || String(a) === String(b);
}

function shouldSkipSyncItem(item: DeckSyncItemState | undefined) {
  return item ? SKIPPED_ITEM_STATUSES.has(item.status) : false;
}
