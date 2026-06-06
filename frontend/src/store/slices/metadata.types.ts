import type {
  Campaign,
  Card,
  Cycle,
  DataVersion,
  EncounterSet,
  JsonDataFaction,
  JsonDataSubtype,
  JsonDataType,
  Pack,
  Scenario,
  Taboo,
  TabooSet,
} from "@arkham-build/shared";

export type Metadata = {
  campaigns: Record<string, Campaign>;
  cards: Record<string, Card>;
  dataVersion?: DataVersion;
  encounterSets: Record<string, EncounterSet>;
  cycles: Record<string, Cycle>;
  factions: Record<string, JsonDataFaction>;
  packs: Record<string, Pack>;
  scenarios: Record<string, Scenario>;
  subtypes: Record<string, JsonDataSubtype>;
  types: Record<string, JsonDataType>;
  tabooSets: Record<string, TabooSet>;
  taboos: Record<string, Taboo>;
};

export type MetadataSlice = {
  metadata: Metadata;
};
