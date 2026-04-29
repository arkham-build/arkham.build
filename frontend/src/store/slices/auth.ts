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

  async initSession() {
    set((state) => ({
      auth: { ...state.auth, status: "loading" },
    }));

    try {
      const session = await fetchSession(getHttpClient(get()));
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
        await get().bootstrapAuthenticatedState();
      } catch (error) {
        // settings sync bootstrap failure should be surfaced via sync state without failing session init.
        console.error(error);
      }
    }

    await dehydrate(get(), "app");
  },

  async login(payload) {
    const client = getHttpClient(get());

    await postLogin(client, payload);
    const session = await fetchSession(client);
    set({
      auth: { session, status: "authenticated" },
    });
    try {
      await get().bootstrapAuthenticatedState();
    } catch (error) {
      // settings sync bootstrap failure should be surfaced via sync state without failing session init.
      console.error(error);
    }
    await dehydrate(get(), "app");
  },

  async logout() {
    try {
      await postLogout(getHttpClient(get()));
    } finally {
      get().clearAccountState({ session: null, status: "idle" });
      await dehydrate(get(), "app");
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
