import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import type { StarterDecksSlice } from "./starter-decks.types";

export const createStarterDecksSlice: StateCreator<
  StoreState,
  [],
  [],
  StarterDecksSlice
> = () => ({
  starterDecks: [],
});
