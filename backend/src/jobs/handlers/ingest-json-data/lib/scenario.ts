import type {
  JsonDataScenario,
  JsonDataScenarioTranslation,
} from "@arkham-build/shared";
import type {
  ItemTranslation,
  WithItemTranslations,
} from "../../../../lib/json-data.types.ts";
import { uniqueStrings } from "./helpers.ts";

export function resolveScenarioRecords(scenarios: ScenarioWithTranslations[]) {
  return {
    scenarios: resolveScenarios(scenarios),
    scenarioEncounterSets: resolveScenarioEncounterSets(scenarios),
    scenarioEncounterSetCards: resolveScenarioEncounterSetCards(scenarios),
  };
}

type ScenarioWithTranslations = WithItemTranslations<
  JsonDataScenario,
  JsonDataScenarioTranslation
>;

type ScenarioRecord = {
  campaign_code: string | null;
  campaign_guide_location: number | null;
  code: string;
  name: string;
  rules_insert_url: string | null;
  translations: ScenarioTranslation[];
  variant_of_code: string | null;
};

type ScenarioTranslation = ItemTranslation<JsonDataScenarioTranslation>;

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

function resolveScenarios(
  scenarios: ScenarioWithTranslations[],
): ScenarioRecord[] {
  return scenarios.map((scenario) => ({
    code: scenario.code,
    name: scenario.name,
    translations: scenario.translations,
    campaign_code: scenario.campaign_code ?? null,
    campaign_guide_location: scenario.campaign_guide_location ?? null,
    rules_insert_url: scenario.rules_insert_url ?? null,
    variant_of_code: scenario.variant_of_code ?? null,
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
