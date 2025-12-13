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

function backResolver(resolver: FieldLookup, hasBackAttr = false) {
  return (onlyReturnBackAttr = false) => {
    return (card: Card, ctx: FieldLookupContext) => {
      if (!ctx.matchBacks && !onlyReturnBackAttr) return resolver(card, ctx);

      let back: Card | undefined;
      if (hasBackAttr && card.double_sided) {
        back = doubleSidedBackCard(card, ctx.i18n.t);
      } else if (card.back_link_id) {
        back = ctx.metadata.cards[card.back_link_id];
      }

      if (onlyReturnBackAttr) return back ? resolver(back, ctx) : null;

      return back
        ? [resolver(card, ctx), resolver(back, ctx)].flat()
        : resolver(card, ctx);
    };
  };
}

const fieldDefinitions: FieldDefinition[] = [
  {
    name: "agility",
    aliases: ["agi", "foot"],
    type: "number",
    lookup: backResolver((card) => card.skill_agility ?? 0),
  },
  {
    name: "back_type",
    type: "string",
    lookup: () => (card) => cardBackType(card),
  },
  {
    name: "class",
    aliases: ["cls", "faction"],
    legacyAlias: "f",
    type: "string",
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
    }, true),
  },
  {
    name: "clues",
    type: "number",
    lookup: backResolver((card) => card.clues ?? card.clues_fixed ?? null),
  },
  {
    name: "combat",
    aliases: ["com", "fist"],
    legacyAlias: "c",
    type: "number",
    lookup: backResolver((card) => card.skill_combat ?? 0),
  },
  {
    name: "cost",
    legacyAlias: "o",
    type: "number",
    lookup: backResolver((card) => card.cost ?? null),
  },
  {
    name: "customizable",
    type: "boolean",
    lookup: () => (card) => !!card.customization_options,
  },
  {
    name: "cycle",
    legacyAlias: "y",
    type: "string",
    lookup:
      () =>
      (card, { metadata }) => {
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
    lookup: backResolver((card) => card.enemy_damage ?? null),
  },
  {
    name: "deck_limit",
    aliases: ["limit"],
    type: "number",
    lookup: backResolver((card) => card.deck_limit ?? null),
  },
  {
    name: "doom",
    type: "number",
    lookup: backResolver((card) => card.doom ?? null),
  },
  {
    name: "encounter_set",
    aliases: ["encounter", "set"],
    type: "string",
    lookup:
      () =>
      (card, { metadata }) => {
        if (!card.encounter_code) return null;

        const encounterSet = metadata.encounterSets[card.encounter_code];
        if (!encounterSet) return null;

        return [card.encounter_code, encounterSet.name];
      },
  },
  {
    name: "evade",
    type: "number",
    lookup: backResolver((card) => card.enemy_evade ?? null),
  },
  {
    name: "exceptional",
    type: "boolean",
    lookup: backResolver((card) => card.exceptional ?? false),
  },
  {
    name: "exile",
    type: "boolean",
    lookup: () => (card) => card.exile ?? false,
  },
  {
    name: "fight",
    type: "number",
    lookup: backResolver((card) => card.enemy_fight ?? null),
  },
  {
    name: "flavor",
    legacyAlias: "v",
    type: "text",
    lookup: backResolver(
      (card) => displayAttribute(card, "flavor") ?? null,
      true,
    ),
  },
  {
    name: "heals_damage",
    aliases: ["hd"],
    type: "boolean",
    lookup: backResolver((card) => filterTag("hd", true)(card)),
  },
  {
    name: "heals_horror",
    aliases: ["hh"],
    type: "boolean",
    lookup: backResolver((card) => filterTag("hh", true)(card)),
  },
  {
    name: "health",
    aliases: ["hp"],
    legacyAlias: "h",
    type: "number",
    lookup: backResolver((card) => card.health ?? null),
  },
  {
    name: "horror",
    type: "number",
    lookup: backResolver((card) => card.enemy_horror ?? null),
  },
  {
    name: "id",
    aliases: ["code"],
    type: "string",
    lookup: backResolver((card) => card.code),
  },
  {
    name: "illustrator",
    aliases: ["artist", "illu"],
    legacyAlias: "l",
    type: "string",
    lookup: backResolver((card) => card.illustrator ?? null, true),
  },
  {
    name: "intellect",
    aliases: ["int", "book"],
    legacyAlias: "i",
    type: "number",
    lookup: backResolver((card) => card.skill_intellect ?? 0),
  },
  {
    name: "level",
    aliases: ["xp"],
    legacyAlias: "p",
    type: "number",
    lookup: backResolver((card) => card.xp ?? null),
  },
  {
    name: "multiclass",
    aliases: ["multi"],
    type: "boolean",
    lookup: backResolver(
      (card) => !!(card.faction2_code || card.faction3_code),
    ),
  },
  {
    name: "myriad",
    type: "boolean",
    lookup: () => (card) => card.myriad ?? false,
  },
  {
    name: "name",
    type: "string",
    lookup: backResolver((card) => displayAttribute(card, "name"), true),
  },
  {
    name: "pack",
    legacyAlias: "e",
    type: "string",
    lookup:
      () =>
      (card, { metadata }) => {
        const pack = metadata.packs[card.pack_code];
        if (!pack) return null;

        return [card.pack_code, displayPackName(pack)];
      },
  },
  {
    name: "permanent",
    type: "boolean",
    lookup: backResolver((card) => card.permanent ?? false),
  },
  {
    name: "quantity",
    aliases: ["qt"],
    type: "number",
    lookup: backResolver((card) => card.quantity),
  },
  {
    name: "sanity",
    aliases: ["san"],
    legacyAlias: "s",
    type: "number",
    lookup: backResolver((card) => card.sanity ?? null),
  },
  {
    name: "shroud",
    type: "number",
    lookup: backResolver((card) => card.shroud ?? null),
  },
  {
    name: "slot",
    legacyAlias: "z",
    type: "string",
    lookup: backResolver((card, { i18n }) => {
      const value = card.real_slot ?? null;
      if (value === null) return null;

      const slots = splitMultiValue(value);

      if (i18n.language === "en") return slots;

      return [
        ...slots,
        ...slots.map((s) => i18n.t(`common.slot.${s.toLowerCase()}`)),
      ];
    }, true),
  },
  {
    name: "specialist",
    type: "boolean",
    lookup: backResolver((card) => isSpecialist(card)),
  },
  {
    name: "subname",
    type: "string",
    lookup: backResolver(
      (card) => displayAttribute(card, "subname") ?? null,
      true,
    ),
  },
  {
    name: "subtype",
    aliases: ["sub"],
    legacyAlias: "b",
    type: "string",
    lookup: backResolver((card, { i18n }) => {
      if (!card.subtype_code) return null;

      if (i18n.language === "en") return card.subtype_code;

      return [card.subtype_code, i18n.t(`common.subtype.${card.subtype_code}`)];
    }),
  },
  {
    name: "taboo_set",
    type: "string",
    lookup:
      () =>
      (card, { metadata }) => {
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
    lookup: backResolver(
      (card) => displayAttribute(card, "text") ?? null,
      true,
    ),
  },
  {
    name: "trait",
    legacyAlias: "k",
    type: "string",
    lookup: backResolver((card, { i18n }) => {
      const value = displayAttribute(card, "traits");
      if (value == null) return null;

      const traits = splitMultiValue(value);
      if (i18n.language === "en") return traits;

      return [
        ...traits,
        ...traits.map((trait) => i18n.t(`common.traits.${trait}`)),
      ];
    }, true),
  },
  {
    name: "type",
    legacyAlias: "t",
    type: "string",
    lookup: backResolver((card, { i18n }) => {
      if (i18n.language === "en") return card.type_code;
      return [card.type_code, i18n.t(`common.type.${card.type_code}`)];
    }),
  },
  {
    name: "unique",
    legacyAlias: "u",
    type: "boolean",
    lookup: backResolver((card) => card.is_unique ?? false),
  },
  {
    name: "vengeance",
    type: "number",
    lookup: backResolver((card) => card.vengeance ?? null),
  },
  {
    name: "victory",
    legacyAlias: "j",
    type: "number",
    lookup: backResolver((card) => card.victory ?? null),
  },
  {
    name: "wild",
    legacyAlias: "d",
    type: "number",
    lookup: backResolver((card) => card.skill_wild ?? 0),
  },
  {
    name: "willpower",
    aliases: ["will", "brain"],
    legacyAlias: "w",
    type: "number",
    lookup: backResolver((card) => card.skill_willpower ?? 0),
  },
];

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

    map[`back_${field.name}`] = backField;

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
