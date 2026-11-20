import {
  type JsonDataCard,
  type JsonDataCycle,
  JsonDataCycleSchema,
  type JsonDataPack,
  JsonDataPackSchema,
} from "@arkham-build/shared";
import localCardData from "../../../../data/card-patches/index.ts";
import localCycles from "../../../../data/cycles.json" with { type: "json" };
import localEncounterSets from "../../../../data/encounter_sets.json" with { type: "json" };
import localPacks from "../../../../data/packs.json" with { type: "json" };
import {
  type IngestEncounterSet,
  IngestEncounterSetSchema,
} from "./encounter-sets.ts";

type LocalCard = JsonDataCard & {
  code: string;
  patch?: boolean;
};

type Input = {
  cards: JsonDataCard[];
  cycles: JsonDataCycle[];
  encounterSets: IngestEncounterSet[];
  packs: JsonDataPack[];
};

export function applyLocalData(input: Input): Input {
  return {
    cards: applyLocalCards(input.cards),
    cycles: applyLocalCycles(input.cycles),
    encounterSets: applyLocalEncounterSets(input.encounterSets),
    packs: applyLocalPacks(input.packs),
  };
}

function applyLocalCards(cards: JsonDataCard[]) {
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

    merged.set(localCard.code, nextCard);
  }

  return Array.from(merged.values());
}

function applyLocalCycles(cycles: JsonDataCycle[]) {
  const merged = new Map(cycles.map((cycle) => [cycle.code, cycle]));

  for (const cycle of JsonDataCycleSchema.array().parse(localCycles)) {
    merged.set(cycle.code, cycle);
  }

  return Array.from(merged.values());
}

function applyLocalEncounterSets(encounterSets: IngestEncounterSet[]) {
  const merged = new Map(encounterSets.map((set) => [set.code, set]));

  for (const encounterSet of IngestEncounterSetSchema.array().parse(
    localEncounterSets,
  )) {
    merged.set(encounterSet.code, encounterSet);
  }

  return Array.from(merged.values());
}

function applyLocalPacks(packs: JsonDataPack[]) {
  const merged = new Map(packs.map((pack) => [pack.code, pack]));

  const rcore = merged.get("rcore");
  if (rcore) {
    rcore.reprint_type = "rcore";
    rcore.reprint_packs = ["core"];
  }

  for (const pack of JsonDataPackSchema.array().parse(localPacks)) {
    merged.set(pack.code, pack);
  }

  return Array.from(merged.values());
}

function stripPatch({ patch, ...card }: LocalCard) {
  return card;
}
