import { filterTag } from "@/store/lib/filtering";
import type { Card } from "@/store/schemas/card.schema";
import {
  cardBackType,
  displayAttribute,
  doubleSidedBackCard,
  isSpecialist,
  splitMultiValue,
} from "@/utils/card-utils";
import { displayPackName } from "@/utils/formatting";
import type {
  FieldDescriptor,
  FieldLookup,
  FieldLookupContext,
  FieldType,
} from "./interpreter.types";

interface FieldDefinition {
  aliases?: string[];
  legacyAlias?: string;
  lookup: (onlyBacks: boolean) => FieldLookup;
  name: string;
  type: FieldType;
}

const fieldDefinitions: FieldDefinition[] = [
  {
    aliases: ["ag", "foot"],
    legacyAlias: "a",
    lookup: backResolver((card) => card.skill_agility ?? 0),
    name: "agility",
    type: "number",
  },
  {
    aliases: ["cls", "class"],
    legacyAlias: "f",
    lookup: backResolver((card, { i18n }) => {
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
    }),
    name: "faction",
    type: "string",
  },
  {
    aliases: ["cl"],
    lookup: backResolver((card) => card.clues ?? card.clues_fixed),
    name: "clues",
    type: "number",
  },
  {
    aliases: ["cb", "fist"],
    legacyAlias: "c",
    lookup: backResolver((card) => card.skill_combat ?? 0),
    name: "combat",
    type: "number",
  },
  {
    aliases: ["co"],
    legacyAlias: "o",
    lookup: backResolver((card) => card.cost),
    name: "cost",
    type: "number",
  },
  {
    aliases: ["cus"],
    lookup: () => (card) => !!card.customization_options,
    name: "customizable",
    type: "boolean",
  },
  {
    aliases: ["cy"],
    legacyAlias: "y",
    lookup:
      () =>
      (card, { metadata }) => {
        const pack = metadata.packs[card.pack_code];
        if (!pack) return null;

        const cycle = metadata.cycles[pack.cycle_code];
        if (!cycle) return null;

        return [pack.cycle_code, displayPackName(cycle)];
      },
    name: "cycle",
    type: "string",
  },
  {
    aliases: ["dmg"],
    lookup: backResolver((card) => card.enemy_damage),
    name: "damage",
    type: "number",
  },
  {
    aliases: ["dl", "limit"],
    lookup: backResolver((card) => card.deck_limit),
    name: "deck_limit",
    type: "number",
  },
  {
    aliases: ["do"],
    lookup: backResolver((card) => card.doom),
    name: "doom",
    type: "number",
  },
  {
    aliases: ["en", "encounter", "set"],
    lookup:
      () =>
      (card, { metadata }) => {
        if (!card.encounter_code) return null;

        const encounterSet = metadata.encounterSets[card.encounter_code];
        if (!encounterSet) return null;

        return [card.encounter_code, encounterSet.name];
      },
    name: "encounter_set",
    type: "string",
  },
  {
    aliases: ["ev"],
    lookup: backResolver((card) => card.enemy_evade),
    name: "evade",
    type: "number",
  },
  {
    aliases: ["ex"],
    lookup: backResolver((card) => card.exceptional ?? false),
    name: "exceptional",
    type: "boolean",
  },
  {
    aliases: ["exl"],
    lookup: () => (card) => card.exile ?? false,
    name: "exile",
    type: "boolean",
  },
  {
    aliases: ["fi"],
    lookup: backResolver((card) => card.enemy_fight),
    name: "fight",
    type: "number",
  },
  {
    aliases: ["fl"],
    legacyAlias: "v",
    lookup: backResolver((card) => displayAttribute(card, "flavor")),
    name: "flavor",
    type: "text",
  },
  {
    aliases: ["hd"],
    lookup: backResolver((card) => filterTag("hd", true)(card)),
    name: "heals_damage",
    type: "boolean",
  },
  {
    aliases: ["hh"],
    lookup: backResolver((card) => filterTag("hh", true)(card)),
    name: "heals_horror",
    type: "boolean",
  },
  {
    aliases: ["hp"],
    legacyAlias: "h",
    lookup: backResolver((card) => card.health),
    name: "health",
    type: "number",
  },
  {
    aliases: ["ho"],
    lookup: backResolver((card) => card.enemy_horror),
    name: "horror",
    type: "number",
  },
  {
    aliases: ["code"],
    lookup: backResolver((card) => card.code),
    name: "id",
    type: "string",
  },
  {
    aliases: ["il", "illu", "artist"],
    legacyAlias: "l",
    lookup: backResolver((card) => card.illustrator),
    name: "illustrator",
    type: "string",
  },
  {
    aliases: ["in", "int", "book"],
    legacyAlias: "i",
    lookup: backResolver((card) => card.skill_intellect ?? 0),
    name: "intellect",
    type: "number",
  },
  {
    aliases: ["level", "lvl"],
    legacyAlias: "p",
    lookup: backResolver((card) => card.xp),
    name: "xp",
    type: "number",
  },
  {
    aliases: ["mu", "multi"],
    lookup: backResolver(
      (card) => !!(card.faction2_code || card.faction3_code),
    ),
    name: "multiclass",
    type: "boolean",
  },
  {
    aliases: ["my"],
    lookup: () => (card) => card.myriad ?? false,
    name: "myriad",
    type: "boolean",
  },
  {
    aliases: ["na"],
    lookup: backResolver((card) => displayAttribute(card, "name")),
    name: "name",
    type: "string",
  },
  {
    aliases: ["pa"],
    legacyAlias: "e",
    lookup:
      () =>
      (card, { metadata }) => {
        const pack = metadata.packs[card.pack_code];
        if (!pack) return null;

        return [card.pack_code, displayPackName(pack)];
      },
    name: "pack",
    type: "string",
  },
  {
    aliases: ["pe", "perm"],
    lookup: backResolver((card) => card.permanent ?? false),
    name: "permanent",
    type: "boolean",
  },
  {
    aliases: ["qt", "qty"],
    lookup: backResolver((card) => card.quantity),
    name: "quantity",
    type: "number",
  },
  {
    aliases: ["rt"],
    lookup: () => (card) => cardBackType(card),
    name: "reverse_type",
    type: "string",
  },
  {
    aliases: ["sa"],
    legacyAlias: "s",
    lookup: backResolver((card) => card.sanity),
    name: "sanity",
    type: "number",
  },
  {
    aliases: ["sh"],
    lookup: backResolver((card) => card.shroud),
    name: "shroud",
    type: "number",
  },
  {
    aliases: ["sl"],
    legacyAlias: "z",
    lookup: backResolver((card, { i18n }) => {
      const value = card.real_slot;
      if (value == null) return null;

      const slots = splitMultiValue(value);

      if (i18n.language === "en") return slots;

      return [
        ...slots,
        ...slots.map((s) => i18n.t(`common.slot.${s.toLowerCase()}`)),
      ];
    }),
    name: "slot",
    type: "string",
  },
  {
    aliases: ["sp"],
    lookup: backResolver((card) => isSpecialist(card)),
    name: "specialist",
    type: "boolean",
  },
  {
    aliases: ["sn"],
    lookup: backResolver((card) => displayAttribute(card, "subname")),
    name: "subname",
    type: "string",
  },
  {
    aliases: ["st"],
    legacyAlias: "b",
    lookup: backResolver((card, { i18n }) => {
      if (!card.subtype_code) return null;
      if (i18n.language === "en") return card.subtype_code;
      return [card.subtype_code, i18n.t(`common.subtype.${card.subtype_code}`)];
    }),
    name: "subtype",
    type: "string",
  },
  {
    aliases: ["ts"],
    lookup:
      () =>
      (card, { metadata }) => {
        if (card.taboo_set_id == null) return null;
        const taboo = metadata.tabooSets[card.taboo_set_id];
        if (!taboo) return null;
        return taboo.name;
      },
    name: "taboo_set",
    type: "string",
  },
  {
    aliases: ["txt"],
    legacyAlias: "x",
    lookup: backResolver((card) => displayAttribute(card, "text")),
    name: "text",
    type: "text",
  },
  {
    aliases: ["tr"],
    legacyAlias: "k",
    lookup: backResolver((card, { i18n }) => {
      const value = displayAttribute(card, "traits");
      if (value == null) return null;

      const traits = splitMultiValue(value);
      if (i18n.language === "en") return traits;

      return [
        ...traits,
        ...traits.map((trait) => i18n.t(`common.traits.${trait}`)),
      ];
    }),
    name: "trait",
    type: "string",
  },
  {
    aliases: ["ty"],
    legacyAlias: "t",
    lookup: backResolver((card, { i18n }) => {
      if (i18n.language === "en") return card.type_code;
      return [card.type_code, i18n.t(`common.type.${card.type_code}`)];
    }),
    name: "type",
    type: "string",
  },
  {
    aliases: ["un"],
    legacyAlias: "u",
    lookup: backResolver((card) => card.is_unique ?? false),
    name: "unique",
    type: "boolean",
  },
  {
    aliases: ["ve"],
    lookup: backResolver((card) => card.vengeance),
    name: "vengeance",
    type: "number",
  },
  {
    aliases: ["vp"],
    legacyAlias: "j",
    lookup: backResolver((card) => card.victory),
    name: "victory",
    type: "number",
  },
  {
    aliases: ["wd"],
    legacyAlias: "d",
    lookup: backResolver((card) => card.skill_wild ?? 0),
    name: "wild",
    type: "number",
  },
  {
    aliases: ["wp", "will", "brain"],
    legacyAlias: "w",
    lookup: backResolver((card) => card.skill_willpower ?? 0),
    name: "willpower",
    type: "number",
  },
];

function backResolver(resolver: FieldLookup) {
  return (onlyReturnBackAttr = false) => {
    return (card: Card, ctx: FieldLookupContext) => {
      if (!ctx.matchBacks && !onlyReturnBackAttr) return resolver(card, ctx);

      let back: Card | undefined;
      if (card.double_sided) {
        back = doubleSidedBackCard(card, ctx.i18n.t) as Card;
      } else if (card.back_link_id) {
        back = ctx.metadata.cards[card.back_link_id];
      }

      if (onlyReturnBackAttr) return resolver(back ?? ({} as Card), ctx);

      return back
        ? [resolver(card, ctx), resolver(back, ctx)].flat()
        : resolver(card, ctx);
    };
  };
}

function buildAllFields(): Record<string, FieldDescriptor> {
  const map: Record<string, FieldDescriptor> = {};

  for (const field of fieldDefinitions) {
    const descriptor: FieldDescriptor = {
      lookup: field.lookup(false),
      type: field.type,
    };

    map[field.name] = descriptor;

    const backField = {
      lookup: field.lookup(true),
      type: field.type,
    };

    map[`back:${field.name}`] = backField;

    if (field.aliases) {
      for (const alias of field.aliases) {
        map[alias] = descriptor;
        map[`back:${alias}`] = backField;
      }
    }

    if (field.legacyAlias) {
      map[field.legacyAlias] = descriptor;
    }
  }

  return map;
}

export const fields = buildAllFields();

// console.log(
//   Object.values(fieldDefinitions).map(f => ({
//     name: f.name,
//     type: f.type,
//     aliases: f.aliases,
//     legacyAlias: f.legacyAlias,
//   })
// ));
