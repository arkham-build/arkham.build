import type { CompleteProfileResponse } from "@arkham-build/shared";
import type { StateCreator } from "zustand";
import {
  canonicalizeCardTagsState,
  getEmptyCardTagsState,
} from "../lib/card-tags.ts";
import { updateDeckSyncSuccess } from "../lib/sync.ts";
import { rebuildDeckHistory } from "../lib/sync-reconciliation.ts";
import { dehydrate } from "../persist/index.ts";
import { selectLookupTables } from "../selectors/shared.ts";
import {
  deleteAccount as deleteAccountRequest,
  fetchSession,
  postLogin,
  postLogout,
} from "../services/requests/auth.ts";
import { ApiError } from "../services/requests/shared.ts";
import type { AuthSlice, AuthState } from "./auth.types.ts";
import type { StoreState } from "./index.ts";

function getInitialAuthState(): AuthState {
  return {
    session: null,
    status: "idle",
  };
}

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (
  set,
  get,
) => ({
  auth: getInitialAuthState(),

  applyCompleteProfileResponse(response: CompleteProfileResponse) {
    const uploads = response.uploads;
    if (!uploads) return;

    set((state) => {
      const accountId = state.auth.session?.account.id;
      if (!accountId) return state;

      let cardTags = state.cardTags;
      let data = state.data;
      let deckEdits = state.deckEdits;
      let sync = state.sync;

      if (uploads.decks?.length) {
        const now = Date.now();
        const deckIdMap = uploads.deckIdMap ?? {};
        const decks = { ...data.decks };
        const deckFolders = { ...data.deckFolders };
        const undoHistory = data.undoHistory
          ? { ...data.undoHistory }
          : undefined;
        deckEdits = { ...deckEdits };

        for (const [previousId, nextId] of Object.entries(deckIdMap)) {
          delete decks[previousId];
          delete deckEdits[previousId];
          delete undoHistory?.[previousId];

          if (
            !uploads.folders &&
            previousId !== nextId &&
            deckFolders[previousId] != null
          ) {
            deckFolders[nextId] = deckFolders[previousId];
            delete deckFolders[previousId];
          }
        }

        for (const deck of uploads.decks) {
          decks[deck.id] = deck;
          sync = updateDeckSyncSuccess(sync, deck.id, deck.version, now);
        }

        data = {
          ...data,
          deckFolders,
          decks,
          history: rebuildDeckHistory(decks),
          undoHistory,
        };
      }

      if (uploads.folders) {
        data = {
          ...data,
          deckFolders: uploads.folders.state?.deckFolders ?? {},
          folders: uploads.folders.state?.folders ?? {},
        };

        sync = {
          ...sync,
          folders: {
            accountId,
            revision: uploads.folders.revision,
            lastSyncedAt: Date.now(),
            status: "synced",
            error: null,
            conflict: null,
          },
        };
      }

      if (uploads.cardTags) {
        cardTags = canonicalizeCardTagsState(
          uploads.cardTags.state ?? getEmptyCardTagsState(),
          state.metadata,
          selectLookupTables(state).relations.fronts,
        );

        sync = {
          ...sync,
          cardTags: {
            accountId,
            revision: uploads.cardTags.revision,
            lastSyncedAt: Date.now(),
            status: "synced",
            error: null,
            conflict: null,
          },
        };
      }

      if (uploads.settings) {
        sync = {
          ...sync,
          settings: {
            accountId,
            revision: uploads.settings.revision,
            lastSyncedAt: Date.now(),
            status: "synced",
            error: null,
            conflict: null,
          },
        };
      }

      return { cardTags, data, deckEdits, sync };
    });
  },

  async deleteAccount(client) {
    try {
      await deleteAccountRequest(client);
    } finally {
      get().clearAccountState({ session: null, status: "unauthenticated" });
      setSessionInitialized(set, true);
      await dehydrate(get(), "app");
    }
  },

  async handleUnauthorized() {
    const state = get();

    if (!hasAccountState(state)) {
      if (state.auth.status === "unauthenticated") {
        return;
      }

      set({
        auth: {
          session: null,
          status: "unauthenticated",
        },
      });
      setSessionInitialized(set, true);
      await dehydrate(get(), "app");
      return;
    }

    get().clearAccountState({
      session: null,
      status: "unauthenticated",
    });
    setSessionInitialized(set, true);
    await dehydrate(get(), "app");
  },

  async initSession(client) {
    setSessionInitialized(set, false);
    set((state) => ({
      auth: { ...state.auth, status: "loading" },
    }));

    try {
      const session = await fetchSession(client);
      set({
        auth: { session, status: "authenticated" },
      });
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        const session = get().auth.session;

        set({
          auth: {
            session,
            status: session ? "authenticated" : "unauthenticated",
          },
        });
      }
    }

    if (get().auth.status === "authenticated") {
      if (get().auth.session?.account.profileComplete) {
        try {
          await get().bootstrapAuthenticatedState(client);
        } catch (error) {
          console.error(error);
        }
      }
    }

    setSessionInitialized(set, true);

    await dehydrate(get(), "app");
  },

  async login(client, payload) {
    await postLogin(client, payload);

    const session = await fetchSession(client);
    set({
      auth: { session, status: "authenticated" },
    });
    setSessionInitialized(set, true);

    if (session.account.profileComplete) {
      try {
        await get().bootstrapAuthenticatedState(client);
      } catch (error) {
        console.error(error);
      }
    }

    await get().refreshSession(client);
    await dehydrate(get(), "app");
  },

  async logout(client) {
    try {
      await postLogout(client);
    } finally {
      get().clearAccountState({ session: null, status: "idle" });
      setSessionInitialized(set, true);
      await dehydrate(get(), "app");
    }
  },

  async refreshSession(client) {
    await refreshSession(set, get, client);
  },
});

function hasAccountState(state: StoreState) {
  return (
    state.auth.session != null ||
    state.sync.settings.accountId != null ||
    state.sync.decks.accountId != null ||
    state.sync.folders.accountId != null ||
    state.sync.cardTags.accountId != null
  );
}

function setSessionInitialized(
  set: Parameters<StateCreator<StoreState, [], [], AuthSlice>>[0],
  sessionInitialized: boolean,
) {
  set((state) => ({
    ui: {
      ...state.ui,
      sessionInitialized,
    },
  }));
}

async function refreshSession(
  set: Parameters<StateCreator<StoreState, [], [], AuthSlice>>[0],
  get: Parameters<StateCreator<StoreState, [], [], AuthSlice>>[1],
  client: Parameters<AuthSlice["initSession"]>[0],
) {
  if (get().auth.status !== "authenticated") {
    return;
  }

  try {
    const session = await fetchSession(client);

    if (get().auth.status !== "authenticated") {
      return;
    }

    set((state) => ({
      auth: {
        ...state.auth,
        session,
      },
    }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await get().handleUnauthorized();
    }
  }
}
