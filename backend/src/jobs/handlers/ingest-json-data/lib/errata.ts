import type { JsonDataErrata } from "@arkham-build/shared";
import { getInsertedId, uniqueStrings } from "./helpers.ts";

export function resolveErrataRecords(errata: JsonDataErrata[]): ErrataRecord[] {
  return errata.map((item, index) => ({
    position: index + 1,
    type: item.type,
    section: item.type === "rulebook_errata" ? item.section : null,
    ruling: item.ruling,
    citation: item.citation,
  }));
}

export function resolveErrataReferenceRecords(
  errata: JsonDataErrata[],
  idsByPosition: ReadonlyMap<number, number>,
) {
  const errataCards: ErrataCardRecord[] = [];
  const errataCycles: ErrataCycleRecord[] = [];
  const errataScenarios: ErrataScenarioRecord[] = [];

  errata.forEach((item, index) => {
    const errataId = getInsertedId(idsByPosition, index + 1, "errata");

    if (item.type === "card_errata") {
      uniqueStrings(item.card_codes).forEach((cardId, position) => {
        errataCards.push({
          errata_id: errataId,
          card_id: cardId,
          position: position + 1,
        });
      });
    } else if (item.type === "campaign_errata") {
      uniqueStrings(item.cycles).forEach((cycleCode, position) => {
        errataCycles.push({
          errata_id: errataId,
          cycle_code: cycleCode,
          position: position + 1,
        });
      });

      uniqueStrings(item.scenario_codes).forEach((scenarioCode, position) => {
        if (
          !scenarioCode.startsWith("return") &&
          scenarioCode !== "blob" &&
          scenarioCode !== "red_tide_rising" &&
          scenarioCode !== "read_or_die"
        ) {
          errataScenarios.push({
            errata_id: errataId,
            scenario_code: scenarioCode,
            position: position + 1,
          });
        }
      });
    }
  });

  return { errataCards, errataCycles, errataScenarios };
}

type ErrataRecord = {
  position: number;
  type: JsonDataErrata["type"];
  section: string | null;
  ruling: string;
  citation: string;
};

type ErrataCardRecord = {
  errata_id: number;
  card_id: string;
  position: number;
};

type ErrataCycleRecord = {
  errata_id: number;
  cycle_code: string;
  position: number;
};

type ErrataScenarioRecord = {
  errata_id: number;
  scenario_code: string;
  position: number;
};
