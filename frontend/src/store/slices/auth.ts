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
      const session = await fetchSession();
      set({
        auth: { session, status: "authenticated" },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        set((state) => ({
          auth: { ...state.auth, status: "unauthenticated" },
        }));
        get().resetSync();
      } else {
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
    await postLogin(payload);
    const session = await fetchSession();
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
      await postLogout();
    } finally {
      set({
        auth: { session: null, status: "idle" },
      });
      get().resetSync();
    }
    await dehydrate(get(), "app");
  },
});
