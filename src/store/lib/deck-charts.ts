import { splitMultiValue } from "@/utils/card-utils";
import { FACTION_ORDER, type FactionName, SKILL_KEYS } from "@/utils/constants";
import type { Card } from "../services/queries.types";
import type { DeckCharts } from "./types";

export type ChartableData<T extends string | number = number> = {
  x: T;
  y: number;
}[];

export function emptyDeckCharts(): DeckCharts {
  return {
    costCurve: new Map(),
    skillIcons: new Map(SKILL_KEYS.map((skill) => [`skill_${skill}`, 0])),
    factions: new Map(FACTION_ORDER.map((faction) => [faction, 0] as const)),
    traits: new Map(),
  };
}

export function addCardToDeckCharts(
  card: Card,
  quantity: number,
  accumulator: DeckCharts,
) {
  // Cost curve
  if (typeof card.cost === "number" && card.cost !== -2) {
    // Group very high cost cards together
    const normalizedCost = card.cost >= 7 ? 7 : card.cost;
    const entry = accumulator.costCurve.get(normalizedCost) ?? 0;
    accumulator.costCurve.set(normalizedCost, entry + quantity);
  }

  // Skill icons
  for (const skill of SKILL_KEYS) {
    const skillKey = `skill_${skill}` as const;
    const skillValue = card[skillKey];

    if (skillValue) {
      const entry = accumulator.skillIcons.get(skillKey) ?? 0;
      accumulator.skillIcons.set(skillKey, entry + skillValue * quantity);
    }
  }

  // Factions
  const cardFactions = [
    card.faction_code,
    card.faction2_code,
    card.faction3_code,
  ];

  for (const faction of cardFactions) {
    if (faction) {
      const entry = accumulator.factions.get(faction as FactionName) ?? 0;
      accumulator.factions.set(faction as FactionName, entry + quantity);
    }
  }

  // Traits
  for (const trait of splitMultiValue(card.real_traits)) {
    const entry = accumulator.traits.get(trait) ?? 0;
    accumulator.traits.set(trait, entry + quantity);
  }
}

function sortByKey<T extends string | number>(
  [a]: [T, number],
  [b]: [T, number],
): number {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return a.toString().localeCompare(b.toString());
}

function sortByValue<T extends string | number>(
  [_, a]: [T, number],
  [__, b]: [T, number],
): number {
  return b - a;
}

export function toChartableData<T extends number | string>(
  map: Map<T, number>,
  sortBy: "key" | "value" = "key",
): ChartableData<T> {
  return Array.from(map.entries())
    .sort(sortBy === "key" ? sortByKey : sortByValue)
    .map(([x, y]) => ({ x, y }));
}
