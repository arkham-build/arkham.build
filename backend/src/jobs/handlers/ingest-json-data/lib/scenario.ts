import type { JsonDataScenario } from "@arkham-build/shared";
import { uniqueStrings } from "./helpers.ts";

export function resolveScenarioRecords(scenarios: JsonDataScenario[]) {
  return {
    scenarios: resolveScenarios(scenarios),
    scenarioEncounterSets: resolveScenarioEncounterSets(scenarios),
    scenarioEncounterSetCards: resolveScenarioEncounterSetCards(scenarios),
  };
}

type ScenarioRecord = {
  campaign_code: string | null;
  code: string;
  name: string;
  translations: ScenarioTranslation[];
};

type ScenarioTranslation = {
  locale: string;
  name?: string;
};

type ScenarioEncounterSetRecord = {
  encounter_code: string;
  position: number;
  scenario_code: string;
};

type ScenarioEncounterSetCardRecord = {
  card_id: string;
  encounter_code: string;
  position: number;
  scenario_code: string;
};

function resolveScenarios(scenarios: JsonDataScenario[]): ScenarioRecord[] {
  return scenarios.map((scenario) => ({
    code: scenario.code,
    name: scenario.name,
    translations: [],
    campaign_code: scenario.campaign_code ?? null,
  }));
}

function resolveScenarioEncounterSets(
  scenarios: JsonDataScenario[],
): ScenarioEncounterSetRecord[] {
  return scenarios.flatMap((scenario) =>
    uniqueEncounterSets(scenario).map((encounterSet, index) => ({
      scenario_code: scenario.code,
      encounter_code: encounterSet.code,
      position: index + 1,
    })),
  );
}

function resolveScenarioEncounterSetCards(
  scenarios: JsonDataScenario[],
): ScenarioEncounterSetCardRecord[] {
  return scenarios.flatMap((scenario) =>
    uniqueEncounterSets(scenario).flatMap((encounterSet) =>
      uniqueStrings(encounterSet.cards).map((cardId, index) => ({
        scenario_code: scenario.code,
        encounter_code: encounterSet.code,
        card_id: cardId,
        position: index + 1,
      })),
    ),
  );
}

function uniqueEncounterSets(scenario: JsonDataScenario) {
  return [
    ...new Map(scenario.encounter_sets.map((set) => [set.code, set])).values(),
  ];
}
