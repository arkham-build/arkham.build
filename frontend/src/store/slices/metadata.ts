import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import type { Metadata, MetadataSlice } from "./metadata.types";

export function getInitialMetadata(): Metadata {
  return {
    dataVersion: undefined,
    campaigns: {},
    cards: {},
    cycles: {},
    encounterSets: {},
    packs: {},
    factions: {},
    scenarios: {},
    subtypes: {},
    types: {},
    tabooSets: {},
    taboos: {},
  };
}

export const createMetadataSlice: StateCreator<
  StoreState,
  [],
  [],
  MetadataSlice
> = () => ({
  metadata: getInitialMetadata(),
});
