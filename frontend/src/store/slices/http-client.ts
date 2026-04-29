import type { StateCreator } from "zustand";
import { dehydrate } from "../persist";
import type { StoreState } from ".";
import type { HttpClientSlice } from "./http-client.types";

export const createHttpClientSlice: StateCreator<
  StoreState,
  [],
  [],
  HttpClientSlice
> = (set, get) => ({
  httpClient: null,

  setHttpClient(client) {
    set({ httpClient: client });
  },

  async handleUnauthorized() {
    const state = get();

    const shouldReset =
      state.auth.session != null ||
      state.auth.status !== "unauthenticated" ||
      state.sync.settings.accountId != null ||
      state.sync.decks.accountId != null;

    if (!shouldReset) {
      return;
    }

    get().clearAccountState({
      session: null,
      status: "unauthenticated",
    });
    await dehydrate(get(), "app");
  },
});
