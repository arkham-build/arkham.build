import type { StateCreator } from "zustand";
import { dehydrate } from "../persist/index.ts";
import {
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

  async handleUnauthorized() {
    const state = get();

    const shouldReset =
      state.auth.session != null ||
      state.auth.status !== "unauthenticated" ||
      state.sync.settings.accountId != null ||
      state.sync.decks.accountId != null ||
      state.sync.folders.accountId != null;

    if (!shouldReset) {
      return;
    }

    get().clearAccountState({
      session: null,
      status: "unauthenticated",
    });
    await dehydrate(get(), "app");
  },

  async initSession(client) {
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
      try {
        await get().bootstrapAuthenticatedState(client);
      } catch (error) {
        console.error(error);
      } finally {
        await get().refreshSession(client);
      }
    }

    await dehydrate(get(), "app");
  },

  async login(client, payload) {
    await postLogin(client, payload);
    const session = await fetchSession(client);
    set({
      auth: { session, status: "authenticated" },
    });
    try {
      await get().bootstrapAuthenticatedState(client);
    } catch (error) {
      console.error(error);
    } finally {
      await get().refreshSession(client);
    }
    await dehydrate(get(), "app");
  },

  async logout(client) {
    try {
      await postLogout(client);
    } finally {
      get().clearAccountState({ session: null, status: "idle" });
      await dehydrate(get(), "app");
    }
  },

  async refreshSession(client) {
    await refreshSession(set, get, client);
  },
});

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
