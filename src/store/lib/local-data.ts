import localCards from "@/store/services/data/cards.json";
import localCycles from "@/store/services/data/cycles.json";
import localEncounters from "@/store/services/data/encounter_sets.json";
import localPacks from "@/store/services/data/packs.json";
import {
  cardToApiFormat,
  cycleToApiFormat,
  packToApiFormat,
} from "@/utils/arkhamdb-json-format";
import type { JsonDataCard } from "../services/queries.types";
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
      metadata.cards[card.code] = cardToApiFormat(
        card as unknown as JsonDataCard,
      );
    }
  }

  for (const pack of localPacks) {
    metadata.packs[pack.code] = packToApiFormat(pack);
  }

  for (const cycle of localCycles) {
    metadata.cycles[cycle.code] = cycleToApiFormat(cycle);
  }

  for (const encounter of localEncounters) {
    metadata.encounterSets[encounter.code] = encounter;
  }

  return metadata;
}
