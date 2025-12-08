import { splitMultiValue } from "@/utils/card-utils";
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
  multiValue?: boolean;
}

const fieldDefinitions: FieldDefinition[] = [
  {
    name: "agility",
    aliases: ["agi", "foot"],
    type: "number",
    lookup: (card) => card.skill_agility ?? null,
  },
  {
    name: "bonded",
    type: "boolean",
    lookup: (card) => (card.bonded_to ? true : null),
  },
  {
    name: "class",
    aliases: ["cls", "faction"],
    legacyAlias: "f",
    type: "string",
    lookup: (card) => card.faction_code,
  },
  {
    name: "clues",
    type: "number",
    lookup: (card) => card.clues ?? null,
  },
  {
    name: "combat",
    aliases: ["com", "fist"],
    legacyAlias: "c",
    type: "number",
    lookup: (card) => card.skill_combat ?? null,
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
    lookup: (card) => (card.customization_options ? true : null),
  },
  {
    name: "cycle",
    legacyAlias: "y",
    type: "string",
    lookup: (_card) => null, // TODO: implement
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
    lookup: (card) => card.encounter_code ?? null,
  },
  {
    name: "evade",
    type: "number",
    lookup: (card) => card.enemy_evade ?? null,
  },
  {
    name: "exceptional",
    type: "boolean",
    lookup: (card) => card.exceptional ?? null,
  },
  {
    name: "exile",
    type: "boolean",
    lookup: (card) => card.exile ?? null,
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
    lookup: (card) => card.flavor ?? null,
  },
  {
    name: "heals_damage",
    aliases: ["hd"],
    type: "boolean",
    lookup: (_card) => null, // TODO: implement
  },
  {
    name: "heals_horror",
    aliases: ["hh"],
    type: "boolean",
    lookup: (_card) => null, // TODO: implement
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
    lookup: (card) => card.skill_intellect ?? null,
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
    lookup: (card) => (card.faction2_code || card.faction3_code ? true : null),
  },
  {
    name: "myriad",
    type: "boolean",
    lookup: (card) => card.myriad ?? null,
  },
  {
    name: "name",
    type: "string",
    lookup: (card) => card.name,
  },
  {
    name: "pack",
    legacyAlias: "e",
    type: "string",
    lookup: (card) => card.pack_code,
  },
  {
    name: "permanent",
    type: "boolean",
    lookup: (card) => card.permanent ?? null,
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
    lookup: (card) => {
      const value = card.slot ?? null;
      if (value === null) return null;
      return splitMultiValue(value);
    },
    multiValue: true,
  },
  {
    name: "specialist",
    type: "boolean",
    lookup: (_card) => null, // TODO: implement
  },
  {
    name: "subname",
    type: "string",
    lookup: (card) => card.subname ?? null,
  },
  {
    name: "subtype",
    aliases: ["sub"],
    legacyAlias: "b",
    type: "string",
    lookup: (card) => card.subtype_code ?? null,
  },
  {
    name: "text",
    legacyAlias: "x",
    type: "text",
    lookup: (card) => card.text ?? null,
  },
  {
    name: "trait",
    legacyAlias: "k",
    type: "string",
    lookup: (card) => {
      const value = card.traits ?? null;
      if (value === null) return null;
      return splitMultiValue(value);
    },
    multiValue: true,
  },
  {
    name: "type",
    legacyAlias: "t",
    type: "string",
    lookup: (card) => card.type_code,
  },
  {
    name: "unique",
    legacyAlias: "u",
    type: "boolean",
    lookup: (card) => card.is_unique ?? null,
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
    lookup: (card) => card.skill_wild ?? null,
  },
  {
    name: "willpower",
    aliases: ["will", "brain"],
    legacyAlias: "w",
    type: "number",
    lookup: (card) => card.skill_willpower ?? null,
  },
];

function buildLookupMap(): Record<string, FieldDescriptor> {
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

export const lookups = buildLookupMap();
