import type { StateCreator } from "zustand";
import { dehydrate } from "../persist/index.ts";
import { fetchMe, postLogin, postLogout } from "../services/requests/auth.ts";
import { ApiError } from "../services/requests/shared.ts";
import type { AuthSlice, AuthState } from "./auth.types.ts";
import type { StoreState } from "./index.ts";

function getInitialAuthState(): AuthState {
  return {
    me: null,
    status: "idle",
  };
}

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (
  set,
  get,
) => ({
  auth: getInitialAuthState(),

  async fetchMe() {
    set((state) => ({
      auth: { ...state.auth, status: "loading" },
    }));

    try {
      const me = await fetchMe();
      set({
        auth: { me, status: "authenticated" },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        set({
          auth: { me: null, status: "unauthenticated" },
        });
      } else {
        const current = get().auth.me;
        set({
          auth: {
            me: current,
            status: current ? "authenticated" : "unauthenticated",
          },
        });
      }
    }

    await dehydrate(get(), "app");
  },

  async login(payload) {
    await postLogin(payload);
    const me = await fetchMe();
    set({
      auth: { me, status: "authenticated" },
    });
    await dehydrate(get(), "app");
  },

  async logout() {
    await postLogout();
    set({
      auth: { me: null, status: "unauthenticated" },
    });
    await dehydrate(get(), "app");
  },

  clearAuth() {
    set({
      auth: { me: null, status: "unauthenticated" },
    });
  },
});
