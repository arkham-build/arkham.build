import type { JsonDataFaq } from "@arkham-build/shared";
import { getInsertedId, uniqueStrings } from "./helpers.ts";

export function resolveFaqRecords(faq: JsonDataFaq[]): FaqRecord[] {
  return faq.map((item, index) => ({
    position: index + 1,
    type: item.type,
    question: item.question,
    ruling: item.ruling,
    citation: item.citation,
  }));
}

export function resolveFaqReferenceRecords(
  faq: JsonDataFaq[],
  idsByPosition: ReadonlyMap<number, number>,
) {
  const faqCards: FaqCardRecord[] = [];
  const faqCycles: FaqCycleRecord[] = [];
  const faqScenarios: FaqScenarioRecord[] = [];

  faq.forEach((item, index) => {
    const faqId = getInsertedId(idsByPosition, index + 1, "faq");

    uniqueStrings(item.card_codes).forEach((cardId, position) => {
      faqCards.push({ faq_id: faqId, card_id: cardId, position: position + 1 });
    });

    uniqueStrings(item.cycles).forEach((cycleCode, position) => {
      faqCycles.push({
        faq_id: faqId,
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
        faqScenarios.push({
          faq_id: faqId,
          scenario_code: scenarioCode,
          position: position + 1,
        });
      }
    });
  });

  return { faqCards, faqCycles, faqScenarios };
}

type FaqRecord = {
  citation: string;
  position: number;
  question: string;
  ruling: string;
  type: JsonDataFaq["type"];
};

type FaqCardRecord = {
  card_id: string;
  faq_id: number;
  position: number;
};

type FaqCycleRecord = {
  cycle_code: string;
  faq_id: number;
  position: number;
};

type FaqScenarioRecord = {
  faq_id: number;
  position: number;
  scenario_code: string;
};
