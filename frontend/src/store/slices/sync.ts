import {
  DECK_BATCH_TARGET_LIMIT,
  type DeckSyncTarget,
  type FolderSyncResponse,
  type CardTagsState as RemoteCardTagsState,
  type FolderSyncState as RemoteFolderSyncState,
} from "@arkham-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";
import { isEmpty } from "@/utils/is-empty";
import { normalizeArkhamDbDeck } from "../lib/arkhamdb-decks";
import {
  canonicalizeCardTagsState,
  getEmptyCardTagsState,
} from "../lib/card-tags";
import { deleteAdapter } from "../lib/deck-crud";
import {
  getExpectedRevision,
  getInitialRevisionSyncState,
  revisionSyncFailed,
  revisionSyncStarted,
  revisionSyncSucceeded,
} from "../lib/revision-sync";
import {
  updateDeckSyncConflictError,
  updateDeckSyncSaving,
  updateDeckSyncSuccess,
} from "../lib/sync";
import {
  applyRemoteDeckReconciliation,
  getDeckReconciliationPlan,
  hasUnsettledDeckSyncItems,
  rebuildDeckHistory,
  removeRemoteAccountDecks,
} from "../lib/sync-reconciliation";
import { dehydrate } from "../persist";
import { selectLookupTables } from "../selectors/shared";
import {
  fetchCardTags,
  isCardTagsConflictError,
  putCardTags,
} from "../services/requests/card-tags";
import { fetchDeckBatch, fetchDeckManifest } from "../services/requests/decks";
import {
  fetchFolders,
  isFoldersConflictError,
  putFolders,
} from "../services/requests/folders";
import type { StoreState } from ".";
import type { AuthState } from "./auth.types";
import { getInitialCardTagsState } from "./card-tags";
import { createArchiveFolder } from "./data";
import type {
  DeckSyncItemState,
  DecksSyncState,
  SyncSlice,
  SyncState,
} from "./sync.types";

function getInitialDeckSyncItemState(): DeckSyncItemState {
  return {
    version: null,
    status: "idle",
    lastSyncedAt: null,
    error: null,
    conflict: null,
  };
}

function getInitialDecksSyncState(): DecksSyncState {
  return {
    accountId: null,
    manifestVersion: null,
    lastSyncedAt: null,
    status: "idle",
    error: null,
    items: {},
  };
}

function getInitialSyncState(): SyncState {
  return {
    sync: {
      settings: getInitialRevisionSyncState(),
      decks: getInitialDecksSyncState(),
      folders: getInitialRevisionSyncState(),
      cardTags: getInitialRevisionSyncState(),
    },
  };
}

export const createSyncSlice: StateCreator<StoreState, [], [], SyncSlice> = (
  set,
  get,
) => ({
  ...getInitialSyncState(),

  async bootstrapAuthenticatedState(client, opts) {
    const state = get();
    const accountId = state.auth.session?.account.id;

    if (state.auth.status !== "authenticated" || !accountId) {
      get().clearAccountState();
      return;
    }

    if (shouldResetSyncForAccount(state.sync, accountId)) {
      get().clearAccountState();
    }

    const settingsResults = await Promise.allSettled([
      get().loadRemoteSettings(client),
    ]);

    if (!isCurrentAccount(get(), accountId)) {
      throwRejectedSyncResults(settingsResults);
      return;
    }

    const remoteStateTasks = [
      get().loadRemoteFolders(client),
      get().loadRemoteCardTags(client),
    ];

    startBootstrapTask(get().syncDecks(client, opts));

    const results = await Promise.allSettled(remoteStateTasks);
    throwRejectedSyncResults([...settingsResults, ...results]);
  },

  clearAccountState(auth?: AuthState) {
    set((state) => ({
      ...removeRemoteAccountDecks(state),
      ...getInitialCardTagsState(),
      ...(auth ? { auth } : {}),
      sync: getInitialSyncState().sync,
    }));
  },

  setRevisionSync(key, payload) {
    set((state) => ({
      sync: {
        ...state.sync,
        [key]: {
          ...state.sync[key],
          ...payload,
        },
      },
    }));
  },

  setDecksSync(payload) {
    set((state) => ({
      sync: {
        ...state.sync,
        decks: {
          ...state.sync.decks,
          ...payload,
        },
      },
    }));
  },

  setDeckSyncItem(id, payload) {
    set((state) => {
      const items = { ...state.sync.decks.items };
      const key = String(id);

      if (payload == null) {
        delete items[key];
      } else {
        items[key] = {
          ...getInitialDeckSyncItemState(),
          ...items[key],
          ...payload,
        };
      }

      return {
        sync: {
          ...state.sync,
          decks: {
            ...state.sync.decks,
            items,
          },
        },
      };
    });
  },

  async loadRemoteFolders(client) {
    const state = get();
    const accountId = state.auth.session?.account.id;

    assert(accountId, "Cannot load remote folders without an account.");

    state.setRevisionSync("folders", revisionSyncStarted(accountId, "loading"));

    try {
      const response = await fetchFolders(client);

      if (!isCurrentAccount(get(), accountId)) return;

      if (response.revision != null && response.state != null) {
        await get().applyRemoteFolders(response);
        return;
      }
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;

      get().setRevisionSync("folders", revisionSyncFailed(accountId, error));
      await dehydrate(get(), "app");
      throw error;
    }

    // Outside the try: a failed seed records its own conflict/error state.
    await get().saveFolders(client, { expectedRevision: null });
  },

  async applyRemoteFolders(payload) {
    const accountId = get().auth.session?.account.id;
    assert(accountId, "Cannot apply remote folders without an account.");

    const folderState = toLocalFolderState(payload.state);

    set((state) => ({
      data: {
        ...state.data,
        folders: folderState.folders,
        deckFolders: folderState.deckFolders,
      },
      sync: {
        ...state.sync,
        folders: {
          ...state.sync.folders,
          ...revisionSyncSucceeded(accountId, payload.revision),
        },
      },
    }));

    await dehydrate(get(), "app");
  },

  async saveFolders(client, opts) {
    const state = get();
    const accountId = state.auth.session?.account.id;

    assert(accountId, "Cannot save folders without an account.");

    const expectedRevision = getExpectedRevision(
      state.sync.folders,
      accountId,
      opts?.expectedRevision,
    );

    state.setRevisionSync("folders", revisionSyncStarted(accountId, "saving"));

    try {
      const response = await putFolders(client, {
        expectedRevision,
        state: getLocalFolderSyncState(get().data),
      });

      if (!isCurrentAccount(get(), accountId)) return;

      get().setRevisionSync(
        "folders",
        revisionSyncSucceeded(accountId, response.revision),
      );
      await dehydrate(get(), "app");
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;

      get().setRevisionSync(
        "folders",
        revisionSyncFailed(accountId, error, isFoldersConflictError),
      );

      await dehydrate(get(), "app");
      throw error;
    }
  },

  async loadRemoteCardTags(client) {
    const state = get();
    const accountId = state.auth.session?.account.id;

    assert(accountId, "Cannot load remote card tags without an account.");

    state.setRevisionSync(
      "cardTags",
      revisionSyncStarted(accountId, "loading"),
    );

    try {
      const response = await fetchCardTags(client);

      if (!isCurrentAccount(get(), accountId)) return;

      if (response.revision != null && response.state != null) {
        await get().applyRemoteCardTags(response);
        return;
      }
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;

      get().setRevisionSync("cardTags", revisionSyncFailed(accountId, error));
      await dehydrate(get(), "app");
      throw error;
    }

    // Outside the try: a failed seed records its own conflict/error state.
    await get().saveCardTags(client, { expectedRevision: null });
  },

  async applyRemoteCardTags(payload) {
    const accountId = get().auth.session?.account.id;
    assert(accountId, "Cannot apply remote card tags without an account.");

    const state = get();
    const cardTags = canonicalizeCardTagsState(
      payload.state ?? getEmptyCardTagsState(),
      state.metadata,
      selectLookupTables(state).relations.fronts,
    );

    set((state) => ({
      cardTags,
      sync: {
        ...state.sync,
        cardTags: {
          ...state.sync.cardTags,
          ...revisionSyncSucceeded(accountId, payload.revision),
        },
      },
    }));

    await dehydrate(get(), "app");
  },

  async saveCardTags(client, opts) {
    const state = get();
    const accountId = state.auth.session?.account.id;

    assert(accountId, "Cannot save card tags without an account.");

    const expectedRevision = getExpectedRevision(
      state.sync.cardTags,
      accountId,
      opts?.expectedRevision,
    );

    state.setRevisionSync("cardTags", revisionSyncStarted(accountId, "saving"));

    try {
      const response = await putCardTags(client, {
        expectedRevision,
        state: getLocalCardTagsSyncState(get()),
      });

      if (!isCurrentAccount(get(), accountId)) return;

      get().setRevisionSync(
        "cardTags",
        revisionSyncSucceeded(accountId, response.revision),
      );
      await dehydrate(get(), "app");
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;

      get().setRevisionSync(
        "cardTags",
        revisionSyncFailed(accountId, error, isCardTagsConflictError),
      );

      await dehydrate(get(), "app");
      throw error;
    }
  },

  async syncDecks(client, opts) {
    const state = get();

    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot sync decks without an account.");

    state.setDecksSync({
      accountId,
      status: "loading",
      error: null,
    });

    try {
      const manifest = await fetchDeckManifest(client, opts);

      if (!isCurrentAccount(get(), accountId)) return;

      const syncDecks = get().sync.decks;

      if (
        syncDecks.manifestVersion === manifest.version &&
        !hasUnsettledDeckSyncItems(syncDecks)
      ) {
        get().setDecksSync({
          accountId,
          lastSyncedAt: Date.now(),
          status: "synced",
          error: null,
        });
        await dehydrate(get(), "app");
        return;
      }

      const plan = getDeckReconciliationPlan({
        data: get().data,
        manifest,
        syncDecks,
      });

      const fetchedDecks = await fetchDecksInBatches(
        client,
        plan.fetchTargets,
        manifest.arkhamdbSyncToken,
      );

      const remoteDeckTargets = new Set(
        fetchedDecks.map((deck) =>
          getDeckTargetKey({
            provider: getSyncedDeckProvider(deck.source),
            id: deck.id,
          }),
        ),
      );

      const missingFetchIds = plan.fetchTargets.filter(
        (target) => !remoteDeckTargets.has(getDeckTargetKey(target)),
      );

      if (!isEmpty(missingFetchIds)) {
        throw new Error(
          "Deck batch response did not include all requested decks.",
        );
      }

      if (!isCurrentAccount(get(), accountId)) return;

      if (fetchedDecks.length) {
        get().cacheFanMadeContent(fetchedDecks);
      }

      const current = get();
      const remoteDecks = normalizeSyncedArkhamDbDecks(current, fetchedDecks);

      const result = applyRemoteDeckReconciliation({
        accountId,
        data: current.data,
        deckEdits: current.deckEdits,
        manifest,
        plan,
        remoteDecks,
        syncDecks: current.sync.decks,
      });

      set((prev) => ({
        data: result.data,
        deckEdits: result.deckEdits,
        sync: {
          ...prev.sync,
          decks: result.syncDecks,
        },
      }));

      await dehydrate(get(), "app", "edits");
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;

      get().setDecksSync({
        accountId,
        status: "error",
        error: getErrorMessage(error),
      });
      await dehydrate(get(), "app");
      throw error;
    } finally {
      if (isCurrentAccount(get(), accountId)) {
        await get().refreshSession(client);
      }
    }
  },

  async resolveDeckConflictWithRefresh(client, id) {
    const conflict = getDeckConflict(get(), id);

    assert(
      conflict.remoteVersion != null,
      `Deck ${id} does not have a remote copy to refresh.`,
    );

    set((prev) => ({
      sync: updateDeckSyncSaving(prev.sync, id),
    }));

    try {
      const deck = get().data.decks[id];
      assert(
        deck && isSyncedDeckSource(deck.source),
        `Deck ${id} is not a synced deck.`,
      );

      const [remoteDeck] = await fetchDeckBatch(client, {
        targets: [{ provider: deck.source, id }],
      });
      assert(remoteDeck, `Remote deck ${id} could not be loaded.`);

      get().cacheFanMadeContent([remoteDeck]);
      applyRemoteDeck(set, remoteDeck);
      await dehydrate(get(), "app", "edits");

      return { kind: conflict.kind };
    } catch (error) {
      set((prev) => ({
        sync: updateDeckSyncConflictError(prev.sync, id, error, conflict),
      }));
      await dehydrate(get(), "app", "edits");
      throw error;
    }
  },

  async resolveDeckConflictWithDiscard(id) {
    const conflict = getDeckConflict(get(), id);
    assert(
      conflict.remoteVersion == null,
      `Deck ${id} still has a remote copy to refresh.`,
    );

    set((prev) => ({
      sync: updateDeckSyncSaving(prev.sync, id),
    }));

    try {
      const state = get();
      const deck = deleteAdapter.format(state, id);

      deleteAdapter.transition(set, deck.id, deck.previous_deck ?? undefined);
      await dehydrate(get(), "app", "edits");

      return { kind: conflict.kind };
    } catch (error) {
      set((prev) => ({
        sync: updateDeckSyncConflictError(prev.sync, id, error, conflict),
      }));
      await dehydrate(get(), "app", "edits");
      throw error;
    }
  },
});

function isCurrentAccount(state: StoreState, accountId: string) {
  return (
    state.auth.status === "authenticated" &&
    state.auth.session?.account.id === accountId
  );
}

function getDeckConflict(state: StoreState, id: string | number) {
  const conflict = state.sync.decks.items[id]?.conflict;
  assert(conflict, `Deck ${id} does not have a conflict.`);
  return conflict;
}

function isSyncedDeckSource(
  source: StoreState["data"]["decks"][string]["source"],
): source is "account" | "arkhamdb" {
  return source === "account" || source === "arkhamdb";
}

function getSyncedDeckProvider(
  source: StoreState["data"]["decks"][string]["source"],
): "account" | "arkhamdb" {
  assert(
    isSyncedDeckSource(source),
    `Unsupported synced deck source: ${source}`,
  );
  return source;
}

function getDeckTargetKey(target: DeckSyncTarget) {
  return `${target.provider}:${String(target.id)}`;
}

function normalizeSyncedArkhamDbDecks(
  state: StoreState,
  decks: StoreState["data"]["decks"][string][],
) {
  return decks.map((deck) =>
    deck.source === "arkhamdb" ? normalizeArkhamDbDeck(deck, state) : deck,
  );
}

function applyRemoteDeck(
  set: Parameters<StateCreator<StoreState, [], [], SyncSlice>>[0],
  remoteDeck: StoreState["data"]["decks"][string],
) {
  set((prev) => {
    const decks = {
      ...prev.data.decks,
      [remoteDeck.id]: remoteDeck,
    };
    const deckEdits = { ...prev.deckEdits };
    const undoHistory = prev.data.undoHistory
      ? { ...prev.data.undoHistory }
      : undefined;

    delete deckEdits[remoteDeck.id];
    delete undoHistory?.[remoteDeck.id];

    return {
      data: {
        ...prev.data,
        decks,
        history: rebuildDeckHistory(decks),
        undoHistory,
      },
      deckEdits,
      sync: updateDeckSyncSuccess(
        prev.sync,
        remoteDeck.id,
        remoteDeck.version,
        Date.now(),
      ),
    };
  });
}

async function fetchDecksInBatches(
  client: Parameters<typeof fetchDeckBatch>[0],
  targets: DeckSyncTarget[],
  arkhamdbSyncToken: string | null | undefined,
) {
  if (isEmpty(targets)) return [];

  const decks: Awaited<ReturnType<typeof fetchDeckBatch>> = [];

  for (let i = 0; i < targets.length; i += DECK_BATCH_TARGET_LIMIT) {
    decks.push(
      ...(await fetchDeckBatch(client, {
        targets: targets.slice(i, i + DECK_BATCH_TARGET_LIMIT),
        arkhamdbSyncToken,
      })),
    );
  }

  return decks;
}

function startBootstrapTask(task: Promise<void>) {
  void task.catch(console.error);
}

function throwRejectedSyncResults(results: PromiseSettledResult<void>[]) {
  const errors = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : [],
  );

  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    throw new Error(errors.map(getErrorMessage).join("; "));
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function shouldResetSyncForAccount(sync: SyncState["sync"], accountId: string) {
  return (
    accountIdMismatches(sync.settings.accountId, accountId) ||
    accountIdMismatches(sync.decks.accountId, accountId) ||
    accountIdMismatches(sync.folders.accountId, accountId) ||
    accountIdMismatches(sync.cardTags.accountId, accountId)
  );
}

function accountIdMismatches(
  storedAccountId: string | null,
  accountId: string,
) {
  return storedAccountId !== null && storedAccountId !== accountId;
}

function getEmptyFolderSyncState(): RemoteFolderSyncState {
  return {
    folders: {},
    deckFolders: {},
  };
}

export function getLocalCardTagsSyncState(
  state: StoreState,
): RemoteCardTagsState {
  return canonicalizeCardTagsState(
    state.cardTags,
    state.metadata,
    selectLookupTables(state).relations.fronts,
  );
}

export function getLocalFolderSyncState(
  data: StoreState["data"],
): RemoteFolderSyncState {
  return sanitizeFolderSyncState({
    folders: data.folders,
    deckFolders: data.deckFolders,
  });
}

function toLocalFolderState(
  state: FolderSyncResponse["state"],
): RemoteFolderSyncState {
  return materializeArchiveFolder(
    sanitizeFolderSyncState(state ?? getEmptyFolderSyncState()),
  );
}

function sanitizeFolderSyncState(
  state: RemoteFolderSyncState,
): RemoteFolderSyncState {
  const folders = { ...state.folders };
  delete folders[ARCHIVE_FOLDER_ID];

  const deckFolders = Object.entries(state.deckFolders).reduce<
    RemoteFolderSyncState["deckFolders"]
  >((acc, [deckId, folderId]) => {
    if (folderId === ARCHIVE_FOLDER_ID || folders[folderId]) {
      acc[deckId] = folderId;
    }

    return acc;
  }, {});

  return {
    folders,
    deckFolders,
  };
}

function materializeArchiveFolder(
  state: RemoteFolderSyncState,
): RemoteFolderSyncState {
  const hasArchiveMembership = Object.values(state.deckFolders).includes(
    ARCHIVE_FOLDER_ID,
  );

  if (!hasArchiveMembership) {
    return state;
  }

  return {
    ...state,
    folders: {
      ...state.folders,
      [ARCHIVE_FOLDER_ID]: createArchiveFolder(),
    },
  };
}
