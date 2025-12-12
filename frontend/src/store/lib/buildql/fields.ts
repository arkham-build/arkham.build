import { filterTag } from "@/store/lib/filtering";
import {
  cardBackType,
  displayAttribute,
  isSpecialist,
  splitMultiValue,
} from "@/utils/card-utils";
import { displayPackName } from "@/utils/formatting";
import type {
  FieldDescriptor,
  FieldLookup,
  FieldType,
} from "./interpreter.types";

interface FieldDefinition {
  name: string;
  aliases?: string[];
  legacyAlias?: string;
  type: FieldType;
  lookup: FieldLookup;
}

const fieldDefinitions: FieldDefinition[] = [
  {
    name: "agility",
    aliases: ["agi", "foot"],
    type: "number",
    lookup: (card) => card.skill_agility ?? 0,
  },
  {
    name: "back_type",
    type: "string",
    lookup: (card) => cardBackType(card),
  },
  {
    name: "class",
    aliases: ["cls", "faction"],
    legacyAlias: "f",
    type: "string",
    lookup: (card, { i18n }) => {
      const factions: string[] = [];

      [card.faction_code, card.faction2_code, card.faction3_code].forEach(
        (faction_code) => {
          if (faction_code) {
            factions.push(faction_code);

            if (i18n.language !== "en") {
              factions.push(i18n.t(`common.factions.${faction_code}`));
            }
          }
        },
      );

      return factions;
    },
  },
  {
    name: "clues",
    type: "number",
    lookup: (card) => card.clues ?? card.clues_fixed ?? null,
  },
  {
    name: "combat",
    aliases: ["com", "fist"],
    legacyAlias: "c",
    type: "number",
    lookup: (card) => card.skill_combat ?? 0,
  },
  {
    name: "cost",
    legacyAlias: "o",
    type: "number",
    lookup: (card) => card.cost ?? null,
  },
  {
    name: "customizable",
    type: "boolean",
    lookup: (card) => !!card.customization_options,
  },
  {
    name: "cycle",
    legacyAlias: "y",
    type: "string",
    lookup: (card, { metadata }) => {
      const pack = metadata.packs[card.pack_code];
      if (!pack) return null;

      const cycle = metadata.cycles[pack.cycle_code];
      if (!cycle) return null;

      return [pack.cycle_code, displayPackName(cycle)];
    },
  },
  {
    name: "damage",
    aliases: ["dmg"],
    type: "number",
    lookup: (card) => card.enemy_damage ?? null,
  },
  {
    name: "deck_limit",
    aliases: ["limit"],
    type: "number",
    lookup: (card) => card.deck_limit ?? null,
  },
  {
    name: "doom",
    type: "number",
    lookup: (card) => card.doom ?? null,
  },
  {
    name: "encounter_set",
    aliases: ["encounter", "set"],
    type: "string",
    lookup: (card, { metadata }) => {
      if (!card.encounter_code) return null;

      const encounterSet = metadata.encounterSets[card.encounter_code];
      if (!encounterSet) return null;

      return [card.encounter_code, encounterSet.name];
    },
  },
  {
    name: "evade",
    type: "number",
    lookup: (card) => card.enemy_evade ?? null,
  },
  {
    name: "exceptional",
    type: "boolean",
    lookup: (card) => card.exceptional ?? false,
  },
  {
    name: "exile",
    type: "boolean",
    lookup: (card) => card.exile ?? false,
  },
  {
    name: "fight",
    type: "number",
    lookup: (card) => card.enemy_fight ?? null,
  },
  {
    name: "flavor",
    legacyAlias: "v",
    type: "text",
    lookup: (card) => displayAttribute(card, "flavor") ?? null,
  },
  {
    name: "heals_damage",
    aliases: ["hd"],
    type: "boolean",
    lookup: (card) => filterTag("hd", true)(card),
  },
  {
    name: "heals_horror",
    aliases: ["hh"],
    type: "boolean",
    lookup: (card) => filterTag("hh", true)(card),
  },
  {
    name: "health",
    aliases: ["hp"],
    legacyAlias: "h",
    type: "number",
    lookup: (card) => card.health ?? null,
  },
  {
    name: "horror",
    type: "number",
    lookup: (card) => card.enemy_horror ?? null,
  },
  {
    name: "id",
    aliases: ["code"],
    type: "string",
    lookup: (card) => card.code,
  },
  {
    name: "illustrator",
    aliases: ["artist", "illu"],
    legacyAlias: "l",
    type: "string",
    lookup: (card) => card.illustrator ?? null,
  },
  {
    name: "intellect",
    aliases: ["int", "book"],
    legacyAlias: "i",
    type: "number",
    lookup: (card) => card.skill_intellect ?? 0,
  },
  {
    name: "level",
    aliases: ["xp"],
    legacyAlias: "p",
    type: "number",
    lookup: (card) => card.xp ?? null,
  },
  {
    name: "multiclass",
    aliases: ["multi"],
    type: "boolean",
    lookup: (card) => !!(card.faction2_code || card.faction3_code),
  },
  {
    name: "myriad",
    type: "boolean",
    lookup: (card) => card.myriad ?? false,
  },
  {
    name: "name",
    type: "string",
    lookup: (card) => displayAttribute(card, "name"),
  },
  {
    name: "pack",
    legacyAlias: "e",
    type: "string",
    lookup: (card, { metadata }) => {
      const pack = metadata.packs[card.pack_code];
      if (!pack) return null;

      return [card.pack_code, displayPackName(pack)];
    },
  },
  {
    name: "permanent",
    type: "boolean",
    lookup: (card) => card.permanent ?? false,
  },
  {
    name: "quantity",
    aliases: ["qt"],
    type: "number",
    lookup: (card) => card.quantity,
  },
  {
    name: "sanity",
    aliases: ["san"],
    legacyAlias: "s",
    type: "number",
    lookup: (card) => card.sanity ?? null,
  },
  {
    name: "shroud",
    type: "number",
    lookup: (card) => card.shroud ?? null,
  },
  {
    name: "slot",
    legacyAlias: "z",
    type: "string",
    lookup: (card, { i18n }) => {
      const value = card.real_slot ?? null;
      if (value === null) return null;

      const slots = splitMultiValue(value);

      if (i18n.language === "en") return slots;

      return [
        ...slots,
        ...slots.map((s) => i18n.t(`common.slot.${s.toLowerCase()}`)),
      ];
    },
  },
  {
    name: "specialist",
    type: "boolean",
    lookup: (card) => isSpecialist(card),
  },
  {
    name: "subname",
    type: "string",
    lookup: (card) => displayAttribute(card, "subname") ?? null,
  },
  {
    name: "subtype",
    aliases: ["sub"],
    legacyAlias: "b",
    type: "string",
    lookup: (card, { i18n }) => {
      if (!card.subtype_code) return null;

      if (i18n.language === "en") return card.subtype_code;

      return [card.subtype_code, i18n.t(`common.subtype.${card.subtype_code}`)];
    },
  },
  {
    name: "taboo_set",
    type: "string",
    lookup: (card, { metadata }) => {
      if (card.taboo_set_id == null) return null;
      const taboo = metadata.tabooSets[card.taboo_set_id];
      if (!taboo) return null;
      return taboo.name;
    },
  },
  {
    name: "text",
    legacyAlias: "x",
    type: "text",
    lookup: (card) => displayAttribute(card, "text") ?? null,
  },
  {
    name: "trait",
    legacyAlias: "k",
    type: "string",
    lookup: (card, { i18n }) => {
      const value = displayAttribute(card, "traits");
      if (value == null) return null;

      const traits = splitMultiValue(value);
      if (i18n.language === "en") return traits;

      return [
        ...traits,
        ...traits.map((trait) => i18n.t(`common.traits.${trait}`)),
      ];
    },
  },
  {
    name: "type",
    legacyAlias: "t",
    type: "string",
    lookup: (card, { i18n }) => {
      if (i18n.language === "en") return card.type_code;
      return [card.type_code, i18n.t(`common.type.${card.type_code}`)];
    },
  },
  {
    name: "unique",
    legacyAlias: "u",
    type: "boolean",
    lookup: (card) => card.is_unique ?? false,
  },
  {
    name: "vengeance",
    type: "number",
    lookup: (card) => card.vengeance ?? null,
  },
  {
    name: "victory",
    legacyAlias: "j",
    type: "number",
    lookup: (card) => card.victory ?? null,
  },
  {
    name: "wild",
    legacyAlias: "d",
    type: "number",
    lookup: (card) => card.skill_wild ?? 0,
  },
  {
    name: "willpower",
    aliases: ["will", "brain"],
    legacyAlias: "w",
    type: "number",
    lookup: (card) => card.skill_willpower ?? 0,
  },
];

function buildAllFields(): Record<string, FieldDescriptor> {
  const map: Record<string, FieldDescriptor> = {};

  for (const field of fieldDefinitions) {
    const descriptor: FieldDescriptor = {
      lookup: field.lookup,
      type: field.type,
    };

    map[field.name] = descriptor;

    if (field.aliases) {
      for (const alias of field.aliases) {
        map[alias] = descriptor;
      }
    }

    if (field.legacyAlias) {
      map[field.legacyAlias] = descriptor;
    }
  }

  return map;
}

export const fields = buildAllFields();
