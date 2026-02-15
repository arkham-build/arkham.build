import {
  ASSET_SLOT_ORDER,
  type Card,
  FACTION_ORDER,
  type FactionName,
  PLAYER_TYPE_ORDER,
  type PlayerType,
} from "@arkham-build/shared";
import { displayAttribute, splitMultiValue } from "@/utils/card-utils";
import type { SortingType } from "../slices/lists.types";
import type { Metadata } from "../slices/metadata.types";

/**
 * Cards
 */

export const SORTING_TYPES: SortingType[] = [
  "cost",
  "cycle",
  "faction",
  "level",
  "name",
  "position",
  "slot",
  "type",
];

export type SortFunction = (a: Card, b: Card) => number;

export function sortAlphabeticalLatin(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortByName(collator: Intl.Collator) {
  return (a: Card, b: Card) =>
    collator.compare(displayAttribute(a, "name"), displayAttribute(b, "name"));
}

function sortByLevel(a: Card, b: Card) {
  if (a.xp === b.xp) {
    return +(a.parallel ?? false) - +(b.parallel ?? false);
  }

  return (a.xp ?? 100) - (b.xp ?? 100);
}

export function sortByPosition(a: Card, b: Card) {
  const positionDiff = (a.position ?? 0) - (b.position ?? 0);

  if (positionDiff === 0) {
    return (a.encounter_position ?? 0) - (b.encounter_position ?? 0);
  }

  return (a.position ?? 0) - (b.position ?? 0);
}

function sortByCycle(metadata: Metadata) {
  return (a: Card, b: Card) => {
    const packA = metadata.packs[a.pack_code];
    const packB = metadata.packs[b.pack_code];

    if (!packA || !packB) {
      return 0;
    }

    const cycleA = metadata.cycles[packA.cycle_code];
    const cycleB = metadata.cycles[packB.cycle_code];

    if (!cycleA || !cycleB) {
      return 0;
    }

    return cycleA.position - cycleB.position;
  };
}

function sortByFaction(a: Card, b: Card) {
  return (
    FACTION_ORDER.indexOf(a.faction_code as FactionName) -
    FACTION_ORDER.indexOf(b.faction_code as FactionName)
  );
}

function sortByCost(a: Card, b: Card) {
  const aCost = a.type_code === "investigator" ? -3 : (a.cost ?? -1);
  const bCost = b.type_code === "investigator" ? -3 : (b.cost ?? -1);
  return aCost - bCost;
}

function sortByType(a: Card, b: Card) {
  return (
    PLAYER_TYPE_ORDER.indexOf(a.type_code as PlayerType) -
    PLAYER_TYPE_ORDER.indexOf(b.type_code as PlayerType)
  );
}

export function makeSortFunction(
  sortings: SortingType[],
  metadata: Metadata,
  collator: Intl.Collator,
): SortFunction {
  const sorts = sortings.map((sorting) => {
    switch (sorting) {
      case "name": {
        return sortByName(collator);
      }

      case "level": {
        return sortByLevel;
      }

      case "cycle": {
        return sortByCycle(metadata);
      }

      case "faction": {
        return sortByFaction;
      }

      case "type": {
        return sortByType;
      }

      case "cost": {
        return sortByCost;
      }

      case "slot": {
        return sortBySlot(collator);
      }

      case "subtype": {
        return sortBySubtype;
      }

      default: {
        return sortByPosition;
      }
    }
  });

  return (a: Card, b: Card) => {
    for (const sort of sorts) {
      const result = sort(a, b);
      if (result !== 0) return result;
    }

    return 0;
  };
}

/**
 * Encounter Sets
 */

export function sortByEncounterSet(
  metadata: Metadata,
  collator: Intl.Collator,
) {
  return (a: string, b: string) => {
    const setA = metadata.encounterSets[a];
    const setB = metadata.encounterSets[b];
    if (!setA || !setB) return 0;

    const packA = metadata.packs[setA.pack_code];
    const packB = metadata.packs[setB.pack_code];
    if (!packA || !packB) return 0;

    const cycleA = metadata.cycles[packA.cycle_code];
    const cycleB = metadata.cycles[packB.cycle_code];
    if (!cycleA || !cycleB) return 0;

    return (
      cycleA.position - cycleB.position ||
      packA.position - packB.position ||
      (setA.position ?? 0) - (setB.position ?? 0) ||
      collator.compare(setA.name, setB.name)
    );
  };
}

/**
 * Slots
 */

export function sortBySlots(collator: Intl.Collator) {
  return (a: string, b: string) => {
    const slotA = getSlotIndex(a);
    const slotB = getSlotIndex(b);

    if (slotA === -1 && slotB === -1) {
      return collator.compare(a, b);
    }

    if (slotA === -1) return 1;
    if (slotB === -1) return -1;

    return slotA - slotB;
  };
}

function getSlotIndex(slot: string) {
  if (!slot || slot === "permanent") return -1;

  const index = ASSET_SLOT_ORDER.indexOf(slot);
  if (index !== -1) return index;

  const split = splitMultiValue(slot)[0];
  const splitIndex = ASSET_SLOT_ORDER.indexOf(split);

  return splitIndex === -1 ? -1 : splitIndex + 0.5;
}

function sortBySlot(collator: Intl.Collator) {
  const sortBySlotsFn = sortBySlots(collator);
  return (a: Card, b: Card) => {
    const aSlot = a.permanent ? "permanent" : (a.real_slot ?? "");
    const bSlot = b.permanent ? "permanent" : (b.real_slot ?? "");
    return sortBySlotsFn(aSlot, bSlot);
  };
}

/**
 * Types
 */

export function sortTypesByOrder(a: string, b: string) {
  return (
    PLAYER_TYPE_ORDER.indexOf(a as PlayerType) -
    PLAYER_TYPE_ORDER.indexOf(b as PlayerType)
  );
}

export function sortNumerical(a: number, b: number) {
  return a - b;
}

export function sortByFactionOrder(a: string, b: string) {
  return (
    FACTION_ORDER.indexOf(a as FactionName) -
    FACTION_ORDER.indexOf(b as FactionName)
  );
}

function sortBySubtype(a: Card, b: Card) {
  const RANKING: (string | null | undefined)[] = ["basicweakness", "weakness"];
  return RANKING.indexOf(a.subtype_code) - RANKING.indexOf(b.subtype_code);
}
