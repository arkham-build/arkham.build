import type { JsonDataCard, JsonDataEncounterSet } from "@arkham-build/shared";

export function resolveEncounterSets(
  encounterSets: JsonDataEncounterSet[],
  cards: JsonDataCard[],
) {
  const encounterSetsMap = encounterSets.reduce(
    (acc, curr) => {
      acc[curr.code] ??= curr;
      return acc;
    },
    {} as Record<string, JsonDataEncounterSet>,
  );

  const packCodeMapping = cards.reduce(
    (acc, curr) => {
      if (curr.encounter_code) {
        acc[curr.encounter_code] = curr.pack_code;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  return Object.values(encounterSetsMap).reduce(
    (acc, set) => {
      const pack_code = packCodeMapping[set.code];
      if (!pack_code) return acc;
      acc.push({ ...set, pack_code });
      return acc;
    },
    [] as (JsonDataEncounterSet & { pack_code: string })[],
  );
}
