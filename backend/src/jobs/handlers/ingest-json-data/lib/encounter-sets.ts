import type { JsonDataCard, JsonDataEncounterSet } from "@arkham-build/shared";

export type IngestEncounterSet = JsonDataEncounterSet & {
  pack_code?: string;
};

export function resolveEncounterSets(
  encounterSets: readonly IngestEncounterSet[],
  cards: readonly EncounterSetCard[],
): EncounterSetRecord[] {
  const encounterSetsByCode = new Map<string, IngestEncounterSet>();

  for (const encounterSet of encounterSets) {
    if (!encounterSetsByCode.has(encounterSet.code)) {
      encounterSetsByCode.set(encounterSet.code, encounterSet);
    }
  }

  const packCodesByEncounterSet = new Map<string, string>();

  for (const card of cards) {
    if (card.encounter_code) {
      packCodesByEncounterSet.set(card.encounter_code, card.pack_code);
    }
  }

  const records: EncounterSetRecord[] = [];

  for (const encounterSet of encounterSetsByCode.values()) {
    const packCode =
      encounterSet.pack_code ?? packCodesByEncounterSet.get(encounterSet.code);
    if (!packCode) continue;

    records.push({ ...encounterSet, pack_code: packCode });
  }

  return records;
}

type EncounterSetRecord = JsonDataEncounterSet & {
  pack_code: string;
};

type EncounterSetCard = Pick<JsonDataCard, "encounter_code" | "pack_code">;
