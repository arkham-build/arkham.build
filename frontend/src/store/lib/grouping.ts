import type { Card } from "@arkham-build/shared";
import {
  displayPackName,
  formatSlots,
  shortenPackName,
} from "@/utils/formatting";
import i18n from "@/utils/i18n";
import type { GroupingType } from "../slices/lists.types";
import type { Metadata } from "../slices/metadata.types";
import {
  type SortFunction,
  sortByEncounterSet,
  sortByFactionOrder,
  sortBySlots,
  sortNumerical,
  sortTypesByOrder,
} from "./sorting";

export const NONE = "none";

const LEVEL_0 = "level0";
const UPGRADE = "upgrade";

export const PLAYER_GROUPING_TYPES: GroupingType[] = [
  "base_upgrades",
  "cost",
  "cycle",
  "faction",
  "level",
  "pack",
  "slot",
  "subtype",
  "type",
];

export const ENCOUNTER_GROUPING_TYPES: GroupingType[] = [
  "cycle",
  "encounter_set",
  "pack",
  "subtype",
  "type",
];

type Key = string | number;

type Grouping<K extends Key = string> = {
  data: Record<K, Card[]>;
  groupings: K[];
  type: GroupingType;
};

export type GroupingResult = {
  cards: Card[];
  key: string;
  type: string;
};

type GroupTreeEntry = {
  key: string;
  type: string;
  count: number;
  parent: string | null;
};

export type GroupedCards = {
  data: GroupingResult[];
  hierarchy: Record<string, GroupTreeEntry>;
};

function toGroupingResult<K extends Key>(
  grouping: Grouping<K>,
): GroupingResult[] {
  return grouping.groupings.map((key) => ({
    cards: grouping.data[key],
    key: typeof key === "number" ? key.toString() : (key as string),
    type: grouping.type,
  }));
}

function omitEmptyGroupings<K extends Key>(grouping: Grouping<K>) {
  for (let i = 0; i < grouping.groupings.length; i++) {
    const key = grouping.groupings[i];

    if (!grouping.data[key].length) {
      delete grouping.data[key];
      grouping.groupings.splice(i, 1);
    } else {
      i++;
    }
  }
}

function groupByTypeCode(cards: Card[]) {
  const result = cards.reduce<Grouping>(
    (acc, card) => {
      const code = card.type_code;

      if (!acc.data[code]) {
        acc.data[code] = [card];
        acc.groupings.push(code);
      } else {
        acc.data[code].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "type" },
  );

  omitEmptyGroupings(result);
  result.groupings.sort(sortTypesByOrder);

  return toGroupingResult(result);
}

function groupBySlots(cards: Card[], collator: Intl.Collator) {
  const result = cards.reduce<Grouping>(
    (acc, card) => {
      const slot = card.permanent ? "permanent" : (card.real_slot ?? NONE);

      if (!acc.data[slot]) {
        acc.data[slot] = [card];
        acc.groupings.push(slot);
      } else {
        acc.data[slot].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "slot" },
  );

  omitEmptyGroupings(result);
  result.groupings.sort(sortBySlots(collator));

  return toGroupingResult(result);
}

function groupByLevel(cards: Card[]) {
  const results = cards.reduce<Grouping<number | string>>(
    (acc, card) => {
      const level = card.xp ?? NONE;

      if (!acc.data[level]) {
        acc.data[level] = [card];
        acc.groupings.push(level);
      } else {
        acc.data[level].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "level" },
  );

  omitEmptyGroupings(results);

  results.groupings.sort((a, b) =>
    a === NONE ? 1 : b === NONE ? -1 : sortNumerical(a as number, b as number),
  );

  return toGroupingResult(results);
}

function groupByLevel0VsUpgrade(cards: Card[]) {
  const results = cards.reduce<Grouping>(
    (acc, card) => {
      if (!card.xp) {
        acc.data[LEVEL_0].push(card);
      } else {
        acc.data[UPGRADE].push(card);
      }

      return acc;
    },
    {
      data: { [LEVEL_0]: [], [UPGRADE]: [] },
      groupings: [LEVEL_0, UPGRADE],
      type: "base_upgrades",
    },
  );

  omitEmptyGroupings(results);

  return toGroupingResult(results);
}

function groupByFaction(cards: Card[]) {
  const results = cards.reduce<Grouping>(
    (acc, card) => {
      const faction = card.faction2_code ? "multiclass" : card.faction_code;

      if (!acc.data[faction]) {
        acc.data[faction] = [card];
        acc.groupings.push(faction);
      } else {
        acc.data[faction].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "faction" },
  );

  omitEmptyGroupings(results);
  results.groupings.sort(sortByFactionOrder);

  return toGroupingResult(results);
}

function groupByEncounterSet(
  cards: Card[],
  metadata: Metadata,
  collator: Intl.Collator,
) {
  const results = cards.reduce<Grouping>(
    (acc, card) => {
      const code = card.encounter_code ?? NONE;

      if (!acc.data[code]) {
        acc.data[code] = [card];
        acc.groupings.push(code);
      } else {
        acc.data[code].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "encounter_set" },
  );

  omitEmptyGroupings(results);
  results.groupings.sort(sortByEncounterSet(metadata, collator));

  return toGroupingResult(results);
}

function groupByCost(cards: Card[]) {
  const results = cards.reduce<Grouping<number | string>>(
    (acc, card) => {
      const cost = card.cost ?? NONE;

      if (!acc.data[cost]) {
        acc.data[cost] = [card];
        acc.groupings.push(cost);
      } else {
        acc.data[cost].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "cost" },
  );

  omitEmptyGroupings(results);

  results.groupings.sort((a, b) =>
    a === NONE ? -1 : b === NONE ? 1 : sortNumerical(a as number, b as number),
  );

  return toGroupingResult(results);
}

function groupByCycle(cards: Card[], metadata: Metadata) {
  const results = cards.reduce<Grouping>(
    (acc, card) => {
      const pack = metadata.packs[card.pack_code];
      const cycle = metadata.cycles[pack.cycle_code].code;

      if (!acc.data[cycle]) {
        acc.data[cycle] = [card];
        acc.groupings.push(cycle);
      } else {
        acc.data[cycle].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "cycle" },
  );

  omitEmptyGroupings(results);
  results.groupings.sort(
    (a, b) => metadata.cycles[a].position - metadata.cycles[b].position,
  );

  return toGroupingResult(results);
}

function groupByPack(cards: Card[], metadata: Metadata) {
  const results = cards.reduce<Grouping>(
    (acc, card) => {
      const cardType = card.encounter_code ? "encounter" : "player";

      let pack = metadata.packs[card.pack_code];

      const reprintPackCode = `${pack.cycle_code}${cardType === "encounter" ? "c" : "p"}`;
      const reprintPack = metadata.packs[reprintPackCode];

      if (reprintPack?.reprint) {
        pack = reprintPack;
      }

      if (!acc.data[pack.code]) {
        acc.data[pack.code] = [card];
        acc.groupings.push(pack.code);
      } else {
        acc.data[pack.code].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "pack" },
  );

  omitEmptyGroupings(results);

  results.groupings.sort((a, b) => {
    const aCycle = metadata.cycles[metadata.packs[a].cycle_code];
    const bCycle = metadata.cycles[metadata.packs[b].cycle_code];

    if (aCycle.position !== bCycle.position) {
      return aCycle.position - bCycle.position;
    }

    return metadata.packs[a].position - metadata.packs[b].position;
  });

  return toGroupingResult(results);
}

function groupBySubtypeCode(cards: Card[]) {
  const results = cards.reduce<Grouping>(
    (acc, card) => {
      const subtype = card.subtype_code ?? NONE;

      if (acc.data[subtype]) {
        acc.data[subtype].push(card);
      }

      return acc;
    },
    {
      data: { [NONE]: [], weakness: [], basicweakness: [] },
      groupings: [NONE, "weakness", "basicweakness"],
      type: "subtype",
    },
  );

  omitEmptyGroupings(results);

  return toGroupingResult(results);
}

function applyGrouping(
  cards: Card[],
  grouping: GroupingType,
  metadata: Metadata,
  collator: Intl.Collator,
): GroupingResult[] {
  switch (grouping) {
    case "none": {
      return [
        {
          cards,
          key: "all",
          type: "none",
        },
      ];
    }
    case "subtype":
      return groupBySubtypeCode(cards);
    case "type":
      return groupByTypeCode(cards);
    case "slot":
      return groupBySlots(cards, collator);
    case "level":
      return groupByLevel(cards);
    case "base_upgrades":
      return groupByLevel0VsUpgrade(cards);
    case "faction":
      return groupByFaction(cards);
    case "encounter_set":
      return groupByEncounterSet(cards, metadata, collator);
    case "cost":
      return groupByCost(cards);
    case "cycle":
      return groupByCycle(cards, metadata);
    case "pack":
      return groupByPack(cards, metadata);
  }
}

export function getGroupedCards(
  _groupings: GroupingType[],
  cards: Card[],
  sortFunction: SortFunction,
  metadata: Metadata,
  collator: Intl.Collator,
): GroupedCards {
  const groupings = _groupings.length ? _groupings : ["none" as const];

  const data = applyGrouping(cards, groupings[0], metadata, collator);

  const hierarchy: Record<string, GroupTreeEntry> = {};

  if (groupings.length > 1) {
    for (let i = 1; i < groupings.length; i++) {
      const grouping = groupings[i];

      let j = 0;

      while (j < data.length) {
        const group = data[j];

        const parent = group.key.includes("|")
          ? group.key.split("|").slice(0, -1).join("|")
          : null;

        hierarchy[group.key] = {
          key: group.key,
          type: group.type,
          count: group.cards.length,
          parent,
        };

        const expanded = applyGrouping(
          group.cards,
          grouping,
          metadata,
          collator,
        );

        for (const g of expanded) {
          g.key = `${group.key}|${g.key}`;
          g.type = `${group.type}|${g.type}`;

          hierarchy[g.key] = {
            key: g.key,
            type: g.type,
            count: g.cards.length,
            parent: group.key,
          };
        }

        data.splice(j, 1, ...expanded);

        j += expanded.length;
      }
    }
  } else {
    for (const group of data) {
      hierarchy[group.key] = {
        key: group.key,
        type: group.type,
        count: group.cards.length,
        parent: null,
      };
    }
  }

  for (const group of data) {
    group.cards.sort(sortFunction);
  }

  return { data, hierarchy };
}

export function getGroupingKeyLabel(
  type: string,
  segment: string,
  metadata: Metadata,
) {
  switch (type) {
    case "none": {
      return i18n.t("lists.all_cards");
    }

    case "subtype": {
      if (segment === NONE) return "";
      return i18n.t(`common.subtype.${segment}`);
    }

    case "type": {
      return i18n.t(`common.type.${segment}`, { count: 1 });
    }

    case "cycle": {
      return displayPackName(metadata.cycles[segment]) ?? "";
    }

    case "encounter_set": {
      return metadata.encounterSets[segment]?.name ?? "";
    }

    case "slot": {
      if (segment === NONE) return i18n.t("common.slot.none");
      if (segment === "permanent") return i18n.t("common.permanent");
      return formatSlots(segment);
    }

    case "level": {
      if (segment === NONE) return i18n.t("common.level.none");
      return i18n.t("common.level.value", { level: segment });
    }

    case "cost": {
      if (segment === NONE) return i18n.t("common.cost.none");

      const cost = Number.parseInt(segment, 10);
      if (!Number.isFinite(cost)) return i18n.t("common.cost.none");

      if (cost <= -2) return i18n.t("common.cost.x");
      return i18n.t("common.cost.value", { cost: segment });
    }

    case "faction": {
      return i18n.t(`common.factions.${segment}`);
    }

    case "base_upgrades": {
      if (segment === LEVEL_0) return i18n.t("common.level.base");
      if (segment === UPGRADE) return i18n.t("common.level.upgrades");
      return "";
    }

    case "pack": {
      return shortenPackName(metadata.packs[segment]) ?? "";
    }

    case "default": {
      return segment;
    }
  }

  return "";
}
