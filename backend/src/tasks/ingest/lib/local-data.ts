import type {
  JsonDataCard,
  JsonDataCycle,
  JsonDataEncounterSet,
  JsonDataPack,
} from "@arkham-build/shared";
import localCardData from "../../../data/card-patches/index.ts";
import localCycles from "../../../data/cycles.json" with { type: "json" };
import localEncounterSets from "../../../data/encounter_sets.json" with {
  type: "json",
};
import localPacks from "../../../data/packs.json" with { type: "json" };
import type { WithItemTranslations } from "./json-data.types.ts";

type LocalCard = JsonDataCard & {
  code: string;
  patch?: boolean;
};

type Card = WithItemTranslations<JsonDataCard>;
type Cycle = WithItemTranslations<JsonDataCycle>;
type EncounterSet = WithItemTranslations<JsonDataEncounterSet>;
type Pack = WithItemTranslations<JsonDataPack>;

type Input = {
  cards: Card[];
  cycles: Cycle[];
  encounterSets: EncounterSet[];
  packs: Pack[];
};

export function applyLocalData(input: Input): Input {
  return {
    cards: applyLocalCards(input.cards),
    cycles: applyLocalCycles(input.cycles),
    encounterSets: applyLocalEncounterSets(input.encounterSets),
    packs: applyLocalPacks(input.packs),
  };
}

function applyLocalCards(cards: Card[]) {
  const merged = new Map(cards.map((card) => [card.code, card]));

  for (const localCard of localCardData as LocalCard[]) {
    const nextCard = stripPatch(localCard);

    if (localCard.patch) {
      const existingCard = merged.get(localCard.code);
      if (!existingCard) continue;

      merged.set(localCard.code, {
        ...existingCard,
        ...nextCard,
      });
      continue;
    }

    merged.set(localCard.code, {
      ...nextCard,
      translations: [],
    });
  }

  return Array.from(merged.values());
}

function applyLocalCycles(cycles: Cycle[]) {
  const merged = new Map(cycles.map((cycle) => [cycle.code, cycle]));

  for (const cycle of localCycles) {
    merged.set((cycle as JsonDataCycle).code, normalizeLocalCycle(cycle));
  }

  return Array.from(merged.values());
}

function applyLocalEncounterSets(encounterSets: EncounterSet[]) {
  const merged = new Map(encounterSets.map((set) => [set.code, set]));

  for (const encounterSet of localEncounterSets) {
    merged.set((encounterSet as JsonDataEncounterSet).code, {
      ...(encounterSet as JsonDataEncounterSet),
      translations: [],
    });
  }

  return Array.from(merged.values());
}

function applyLocalPacks(packs: Pack[]) {
  const merged = new Map(packs.map((pack) => [pack.code, pack]));

  const rcore = merged.get("rcore");
  if (rcore) {
    rcore.reprint_type = "rcore";
    rcore.reprint_packs = ["core"];
  }

  for (const pack of localPacks) {
    merged.set((pack as JsonDataPack).code, normalizeLocalPack(pack));
  }

  return Array.from(merged.values());
}

function stripPatch({ patch, ...card }: LocalCard) {
  return card;
}

function normalizeLocalCycle({
  preview,
  ...cycle
}: JsonDataCycle & { preview?: boolean }): Cycle {
  return {
    ...cycle,
    translations: [],
  };
}

function normalizeLocalPack({
  preview,
  ...pack
}: JsonDataPack & { preview?: boolean }): Pack {
  return {
    ...pack,
    translations: [],
  };
}
