import type {
  JsonDataCard,
  JsonDataCycle,
  JsonDataEncounterSet,
  JsonDataPack,
} from "@arkham-build/shared";
import localCardData from "../../../../data/card-patches/index.ts";
import localCycles from "../../../../data/cycles.json" with { type: "json" };
import localEncounterSets from "../../../../data/encounter_sets.json" with {
  type: "json",
};
import localPacks from "../../../../data/packs.json" with { type: "json" };

type LocalCard = JsonDataCard & {
  code: string;
  patch?: boolean;
};

type Input = {
  cards: JsonDataCard[];
  cycles: JsonDataCycle[];
  encounterSets: JsonDataEncounterSet[];
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

  for (const cycle of localCycles) {
    merged.set((cycle as JsonDataCycle).code, normalizeLocalCycle(cycle));
  }

  return Array.from(merged.values());
}

function applyLocalEncounterSets(encounterSets: JsonDataEncounterSet[]) {
  const merged = new Map(encounterSets.map((set) => [set.code, set]));

  for (const encounterSet of localEncounterSets) {
    merged.set(
      (encounterSet as JsonDataEncounterSet).code,
      encounterSet as JsonDataEncounterSet,
    );
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
}: JsonDataCycle & { preview?: boolean }): JsonDataCycle {
  return cycle;
}

function normalizeLocalPack({
  preview,
  ...pack
}: JsonDataPack & { preview?: boolean }): JsonDataPack {
  return pack;
}
