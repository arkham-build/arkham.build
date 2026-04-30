import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { isEmpty } from "@/utils/is-empty";
import { deleteAdapter } from "../lib/deck-crud";
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
import { fetchDeckBatch, fetchDeckManifest } from "../services/requests/decks";
import type { StoreState } from ".";
import type { AuthState } from "./auth.types";
import type {
  DeckSyncItemState,
  DecksSyncState,
  SettingsSyncState,
  SyncSlice,
  SyncState,
} from "./sync.types";

function getInitialSettingsSyncState(): SettingsSyncState {
  return {
    accountId: null,
    revision: null,
    lastSyncedAt: null,
    status: "idle",
    error: null,
    conflict: null,
  };
}

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
      settings: getInitialSettingsSyncState(),
      decks: getInitialDecksSyncState(),
    },
  };
}

export const createSyncSlice: StateCreator<StoreState, [], [], SyncSlice> = (
  set,
  get,
) => ({
  ...getInitialSyncState(),

  async bootstrapAuthenticatedState(client) {
    const state = get();
    const accountId = state.auth.session?.account.id;

    if (state.auth.status !== "authenticated" || !accountId) {
      get().clearAccountState();
      return;
    }

    if (shouldResetSyncForAccount(state.sync, accountId)) {
      get().clearAccountState();
    }

    const results = await Promise.allSettled([
      state.loadRemoteSettings(client),
      state.syncDecks(client),
    ]);

    // Each sync action records its own user-facing error state; keep bootstrap non-fatal.
    for (const result of results) {
      if (result.status === "rejected") {
        console.error(result.reason);
      }
    }
  },

  clearAccountState(auth?: AuthState) {
    set((state) => ({
      ...removeRemoteAccountDecks(state),
      ...(auth ? { auth } : {}),
      sync: getInitialSyncState().sync,
    }));
  },

  setSettingsSync(payload) {
    set((state) => ({
      sync: {
        ...state.sync,
        settings: {
          ...state.sync.settings,
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

  async syncDecks(client) {
    const state = get();

    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot sync decks without an account.");

    state.setDecksSync({
      accountId,
      status: "loading",
      error: null,
    });

    try {
      const manifest = await fetchDeckManifest(client);

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

      const remoteDecks = isEmpty(plan.fetchIds)
        ? []
        : await fetchDeckBatch(client, { ids: plan.fetchIds });

      const remoteDeckIds = new Set(remoteDecks.map((deck) => String(deck.id)));

      const missingFetchIds = plan.fetchIds.filter(
        (id) => !remoteDeckIds.has(String(id)),
      );

      if (!isEmpty(missingFetchIds)) {
        throw new Error(
          "Deck batch response did not include all requested decks.",
        );
      }

      if (!isCurrentAccount(get(), accountId)) return;

      const current = get();

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
      const [remoteDeck] = await fetchDeckBatch(client, { ids: [id] });
      assert(remoteDeck, `Remote deck ${id} could not be loaded.`);

      applyRemoteDeck(set, remoteDeck);
      await dehydrate(get(), "app", "edits");

      return { kind: conflict.kind };
    } catch (error) {
      set((prev) => ({
        sync: updateDeckSyncConflictError(prev.sync, id, error, conflict.kind),
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
        sync: updateDeckSyncConflictError(prev.sync, id, error, conflict.kind),
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function shouldResetSyncForAccount(sync: SyncState["sync"], accountId: string) {
  return (
    accountIdMismatches(sync.settings.accountId, accountId) ||
    accountIdMismatches(sync.decks.accountId, accountId)
  );
}

function accountIdMismatches(
  storedAccountId: string | null,
  accountId: string,
) {
  return storedAccountId !== null && storedAccountId !== accountId;
}
