import type { Card, Scenario } from "@arkham-build/shared";

type EncounterCard = Pick<Card, "code" | "encounter_code" | "position">;
type ScenarioWithEncounterSets = Pick<Scenario, "encounter_sets">;

type ResolvedCampaignCards = {
  cardCodes: ReadonlySet<string>;
  encounterSetOrder: string[];
};

export function resolveCampaignCards(
  scenarios: readonly ScenarioWithEncounterSets[],
  cards: readonly EncounterCard[],
  campaignCycleCode: string,
  getEncounterSetCycleCode: (encounterSetCode: string) => string,
): ResolvedCampaignCards {
  const cardCodes = new Set<string>();
  const completeEncounterSets = new Set<string>();

  for (const scenario of scenarios) {
    for (const encounterSet of scenario.encounter_sets) {
      if (encounterSet.cards == null) {
        completeEncounterSets.add(encounterSet.code);
        continue;
      }

      for (const cardCode of encounterSet.cards) {
        cardCodes.add(cardCode);
      }
    }
  }

  const firstPositions = new Map<string, number>();

  for (const card of cards) {
    const included =
      cardCodes.has(card.code) ||
      (card.encounter_code != null &&
        completeEncounterSets.has(card.encounter_code));
    if (!included) continue;

    cardCodes.add(card.code);
    updateFirstPosition(firstPositions, card);
  }

  const encounterSetOrder = Array.from(firstPositions.keys()).toSorted(
    (a, b) => {
      const sourceComparison =
        encounterSetSourceOrder(
          getEncounterSetCycleCode(a),
          campaignCycleCode,
        ) -
        encounterSetSourceOrder(getEncounterSetCycleCode(b), campaignCycleCode);
      if (sourceComparison !== 0) return sourceComparison;

      return (
        getEncounterSetFirstPosition(firstPositions, a) -
        getEncounterSetFirstPosition(firstPositions, b)
      );
    },
  );

  return { cardCodes, encounterSetOrder };
}

function updateFirstPosition(
  firstPositions: Map<string, number>,
  card: EncounterCard,
) {
  if (card.encounter_code == null) return;

  const firstPosition = firstPositions.get(card.encounter_code);
  if (firstPosition == null || card.position < firstPosition) {
    firstPositions.set(card.encounter_code, card.position);
  }
}

function getEncounterSetFirstPosition(
  firstPositions: ReadonlyMap<string, number>,
  encounterSetCode: string,
) {
  const position = firstPositions.get(encounterSetCode);
  if (position == null) {
    throw new Error(`Missing first position for ${encounterSetCode}`);
  }
  return position;
}

function encounterSetSourceOrder(cycleCode: string, campaignCycleCode: string) {
  if (cycleCode === campaignCycleCode) return 0;
  if (cycleCode === "core") return 1;
  return 2;
}
