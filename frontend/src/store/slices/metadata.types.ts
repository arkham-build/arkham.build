import type {
  Card,
  DataVersion,
  JsonDataFaction,
  JsonDataSubtype,
  JsonDataType,
} from "@arkham-build/shared";
import type { Campaign } from "../schemas/campaign.schema";
import type { Cycle } from "../schemas/cycle.schema";
import type { EncounterSet } from "../schemas/encounter-set.schema";
import type { Pack } from "../schemas/pack.schema";
import type { Scenario } from "../schemas/scenario.schema";
import type { Taboo } from "../schemas/taboo.schema";
import type { TabooSet } from "../schemas/taboo-set.schema";

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
