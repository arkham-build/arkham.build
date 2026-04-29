import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { isEmpty } from "@/utils/is-empty";
import {
  applyRemoteDeckReconciliation,
  getDeckReconciliationPlan,
  hasUnsettledDeckSyncItems,
} from "../lib/sync-reconciliation";
import { dehydrate } from "../persist";
import { fetchDeckBatch, fetchDeckManifest } from "../services/requests/decks";
import type { StoreState } from ".";
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

  async bootstrapAuthenticatedState() {
    const state = get();
    const accountId = state.auth.session?.account.id;

    if (state.auth.status !== "authenticated" || !accountId) {
      state.resetSync();
      return;
    }

    if (shouldResetSyncForAccount(state.sync, accountId)) {
      state.resetSync();
    }

    const results = await Promise.allSettled([
      state.loadRemoteSettings(),
      state.syncDecks(),
    ]);

    // Each sync action records its own user-facing error state; keep bootstrap non-fatal.
    for (const result of results) {
      if (result.status === "rejected") {
        console.error(result.reason);
      }
    }
  },

  resetSync() {
    set(() => getInitialSyncState());
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

  async syncDecks() {
    const state = get();

    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot sync decks without an account.");

    state.setDecksSync({
      accountId,
      status: "loading",
      error: null,
    });

    try {
      const manifest = await fetchDeckManifest(getHttpClient(get()));

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
        : await fetchDeckBatch(getHttpClient(get()), { ids: plan.fetchIds });

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
});

function getHttpClient(state: StoreState) {
  const client = state.httpClient;

  if (!client) {
    throw new Error("HTTP client not initialized.");
  }

  return client;
}

function isCurrentAccount(state: StoreState, accountId: string) {
  return (
    state.auth.status === "authenticated" &&
    state.auth.session?.account.id === accountId
  );
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
