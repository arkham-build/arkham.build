import localCards from "@/store/services/data/card-patches";
import localCycles from "@/store/services/data/cycles.json";
import localEncounters from "@/store/services/data/encounter_sets.json";
import localPacks from "@/store/services/data/packs.json";
import {
  cardToApiFormat,
  cycleToApiFormat,
  packToApiFormat,
} from "@/utils/arkhamdb-json-format";
import type { JsonDataCard } from "../schemas/card.schema";
import type { JsonDataCycle } from "../schemas/cycle.schema";
import type { EncounterSet } from "../schemas/encounter-set.schema";
import type { JsonDataPack } from "../schemas/pack.schema";
import type { Metadata } from "../slices/metadata.types";

export function applyLocalData(_metadata: Metadata) {
  const metadata = {
    ..._metadata,
    cards: {
      ..._metadata.cards,
    },
    cycles: {
      ..._metadata.cycles,
    },
    packs: {
      ..._metadata.packs,
    },
    encounterSets: {
      ..._metadata.encounterSets,
    },
  };

  for (const card of localCards) {
    if (card.patch) {
      if (!metadata.cards[card.code]) continue;

      metadata.cards[card.code] = {
        ...metadata.cards[card.code],
        ...cardToApiFormat(card as unknown as JsonDataCard, "patch"),
      };
    } else {
      metadata.cards[card.code] = cardToApiFormat({
        ...(card as unknown as JsonDataCard),
        official: true,
      });
    }
  }

  for (const pack of localPacks as JsonDataPack[]) {
    metadata.packs[pack.code] = packToApiFormat(pack);
  }

  for (const cycle of localCycles as JsonDataCycle[]) {
    metadata.cycles[cycle.code] = cycleToApiFormat(cycle);
  }

  for (const encounter of localEncounters as EncounterSet[]) {
    metadata.encounterSets[encounter.code] = encounter;
  }

  return metadata;
}
