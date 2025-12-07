import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import type { RemotingSlice, RemotingState } from "./remoting.types";

function getRemotingState(): RemotingState {
  return {
    arkhamdb: false,
    sync: false,
  };
}

export const createRemotingSlice: StateCreator<
  StoreState,
  [],
  [],
  RemotingSlice
> = (set) => ({
  remoting: getRemotingState(),

  setRemoting(name, value) {
    set((state) => ({
      remoting: {
        ...state.remoting,
        [name]: value,
      },
    }));
  },
});
