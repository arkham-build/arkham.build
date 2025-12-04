import type { Card } from "../schemas/card.schema";
import type { Cycle } from "../schemas/cycle.schema";
import type { DataVersion } from "../schemas/data-version.schema";
import type { EncounterSet } from "../schemas/encounter-set.schema";
import type { Faction, SubType, Type } from "../schemas/metadata.schema";
import type { Pack } from "../schemas/pack.schema";
import type { Taboo } from "../schemas/taboo.schema";
import type { TabooSet } from "../schemas/taboo-set.schema";

export type Metadata = {
  cards: Record<string, Card>;
  dataVersion?: DataVersion;
  encounterSets: Record<string, EncounterSet>;
  cycles: Record<string, Cycle>;
  factions: Record<string, Faction>;
  packs: Record<string, Pack>;
  subtypes: Record<string, SubType>;
  types: Record<string, Type>;
  tabooSets: Record<string, TabooSet>;
  taboos: Record<string, Taboo>;
};

export type MetadataSlice = {
  metadata: Metadata;
};
