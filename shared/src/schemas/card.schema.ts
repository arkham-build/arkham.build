import { z } from "zod";
import {
  COMPARISON_OPERATOR,
  FACTION_ORDER,
  PLAYER_TYPE_ORDER,
} from "../lib/constants.ts";

/* Attachments */

const AttributeFilterSchema = z.object({
  attribute: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  operator: z.enum(COMPARISON_OPERATOR).nullish(),
});

export type AttributeFilter = z.infer<typeof AttributeFilterSchema>;

const AttachmentsSchema = z
  .object({
    code: z.string().register(z.globalRegistry, {
      description:
        "Code of the card that this attachment is based on. For example '05002' for Joe Diamond.",
    }),
    filters: z.array(AttributeFilterSchema).register(z.globalRegistry, {
      description: "List of filters that describe which cards can be attached.",
    }),
    name: z.string().register(z.globalRegistry, {
      description: "Name of this attachment. For example 'Hunch Deck'.",
    }),
    icon: z.string().register(z.globalRegistry, {
      description:
        "Icon for this attachment. This can be one of two things: a URL to an image, or the name of an icon from the Lucide icon set. In the latter case, use the format 'lucide://<icon_name>'.",
    }),
    limit: z.number().nullish().register(z.globalRegistry, {
      description:
        "Maximum number of copies of a single card in this attachment.",
    }),
    requiredCards: z
      .record(z.string(), z.number())
      .nullish()
      .register(z.globalRegistry, {
        description:
          "Cards that are required to be in the deck for this attachment to be valid.",
      }),
    targetSize: z.number().register(z.globalRegistry, {
      description: "Number of cards that can be attached to this card.",
    }),
    traits: z.array(z.string()).nullish().register(z.globalRegistry, {
      description: "List of traits that this attachment has.",
    }),
  })
  .register(z.globalRegistry, {
    description:
      "Attachments describe decks of cards that are attached to other cards. Examples: Joe Diamond's Hunch Deck, Bewitching, Stick to the Plan.",
  });

export type Attachments = z.infer<typeof AttachmentsSchema>;

/* Customizations */

const CustomizationChoice = z.enum([
  "choose_card",
  "choose_trait",
  "remove_slot",
  "choose_skill",
]);

const CustomizationTextChange = z.enum([
  "append",
  "insert",
  "replace",
  "trait",
]);

const CustomizationOptionSchema = z.object({
  card: z
    .object({
      type: z.array(z.string()).nullish(),
      trait: z.array(z.string()).nullish(),
    })
    .nullish(),
  choice: CustomizationChoice.nullish(),
  cost: z.number().nullish(),
  deck_limit: z.number().nullish(),
  health: z.number().nullish(),
  position: z.number().nullish(),
  quantity: z.number().nullish(),
  real_slot: z.string().nullish(),
  real_text: z.string().nullish(),
  real_traits: z.string().nullish(),
  sanity: z.number().nullish(),
  tags: z.array(z.string()).nullish(),
  text_change: CustomizationTextChange,
  xp: z.number(),
});

export type CustomizationOption = z.infer<typeof CustomizationOptionSchema>;

/* Deck Options */

const AtLeastSchema = z.object({
  factions: z.number().nullish(),
  min: z.number(),
  types: z.number().nullish(),
  traits: z.number().nullish(),
});

const OptionSelectSchema = z.object({
  id: z.string(),
  level: z.object({
    min: z.number(),
    max: z.number(),
  }),
  name: z.string(),
  size: z.number().nullish(),
  trait: z.array(z.string()).nullish(),
  type: z.array(z.string()).nullish(),
});

export type OptionSelect = z.infer<typeof OptionSelectSchema>;

const DeckOptionSchema = z.object({
  atleast: AtLeastSchema.nullish(),
  base_level: z.object({ min: z.number(), max: z.number() }).nullish(),
  buildql_query: z.string().nullish(),
  deck_size_select: z.union([z.string(), z.array(z.string())]).nullish(),
  error: z.string().nullish(),
  faction_select: z.array(z.string()).nullish(),
  faction: z.array(z.string()).nullish(),
  id: z.string().nullish(),
  level: z.object({ min: z.number(), max: z.number() }).nullish(),
  limit: z.number().nullish(),
  name: z.string().nullish(),
  not: z.boolean().nullish(),
  option_select: z.array(OptionSelectSchema).nullish(),
  permanent: z.boolean().nullish(),
  slot: z.array(z.string()).nullish(),
  tag: z.array(z.string()).nullish(),
  text_exact: z.array(z.string()).nullish(),
  text: z.array(z.string()).nullish(),
  trait: z.array(z.string()).nullish(),
  type: z.array(z.string()).nullish(),
  uses: z.array(z.string()).nullish(),
  virtual: z.boolean().nullish(),
});

export type DeckOption = z.infer<typeof DeckOptionSchema>;

export type DeckOptionSelectType = "deckSize" | "faction" | "option";

/**
 * ArkhamDB JSON data schema.
 */

const Faction = z.enum(FACTION_ORDER);

export const JsonDataCardSchema = z.object({
  alternate_of: z.string().nullish(),
  back_flavor: z.string().nullish(),
  back_illustrator: z.string().nullish(),
  back_link: z.string().nullish(),
  back_name: z.string().nullish(),
  back_subname: z.string().nullish(),
  back_text: z.string().nullish(),
  back_type: z.string().nullish(),
  back_traits: z.string().nullish(),
  bonded_count: z.number().nullish(),
  bonded_to: z.string().nullish(),
  clues_fixed: z.boolean().nullish(),
  clues: z.number().nullish(),
  code: z.string(),
  cost: z.number().nullish(),
  customization_change: z.string().nullish(),
  customization_options: z.array(CustomizationOptionSchema).nullish(),
  customization_text: z.string().nullish(),
  deck_limit: z.number().nullish(),
  deck_options: z.array(DeckOptionSchema).nullish(),
  deck_requirements: z.string().nullish(),
  doom: z.number().nullish(),
  doom_per_investigator: z.boolean().nullish(),
  double_sided: z.boolean().nullish(),
  duplicate_of: z.string().nullish(),
  encounter_code: z.string().nullish(),
  encounter_position: z.number().nullish(),
  enemy_damage: z.number().nullish(),
  enemy_evade: z.number().nullish(),
  enemy_evade_per_investigator: z.boolean().nullish(),
  enemy_fight: z.number().nullish(),
  enemy_fight_per_investigator: z.boolean().nullish(),
  enemy_horror: z.number().nullish(),
  errata_date: z.string().nullish(),
  exceptional: z.boolean().nullish(),
  exile: z.boolean().nullish(),
  faction_code: Faction,
  faction2_code: Faction.nullish(),
  faction3_code: Faction.nullish(),
  flavor: z.string().nullish(),
  health_per_investigator: z.boolean().nullish(),
  health: z.number().nullish(),
  hidden: z.boolean().nullish(),
  illustrator: z.string().nullish(),
  is_unique: z.boolean().nullish(),
  myriad: z.boolean().nullish(),
  name: z.string(),
  pack_code: z.string(),
  permanent: z.boolean().nullish(),
  position: z.number(),
  quantity: z.number(),
  restrictions: z.string().nullish(),
  sanity: z.number().nullish(),
  shroud: z.number().nullish(),
  shroud_per_investigator: z.boolean().nullish(),
  side_deck_options: z.array(DeckOptionSchema).nullish(),
  side_deck_requirements: z.string().nullish(),
  skill_agility: z.number().nullish(),
  skill_combat: z.number().nullish(),
  skill_intellect: z.number().nullish(),
  skill_wild: z.number().nullish(),
  skill_willpower: z.number().nullish(),
  slot: z.string().nullish(),
  stage: z.number().nullish(),
  starts_in_hand: z.boolean().nullish(),
  starts_in_play: z.boolean().nullish(),
  sticky_mulligan: z.boolean().nullish(),
  subname: z.string().nullish(),
  subtype_code: z.enum(["basicweakness", "weakness"]).nullish(),
  tags: z.string().nullish(),
  text: z.string().nullish(),
  traits: z.string().nullish(),
  type_code: z.enum(PLAYER_TYPE_ORDER),
  vengeance: z.number().nullish(),
  victory: z.number().nullish(),
  xp: z.number().nullish(),
});

export type JsonDataCard = z.infer<typeof JsonDataCardSchema>;

/**
 * Arkham Cards API schema.
 */

const ApiDeckRequirementsSchema = z.object({
  card: z.record(z.string(), z.record(z.string(), z.string())),
  random: z.array(z.object({ value: z.string(), target: z.string() })),
  size: z.number(),
});

const ApiRestrictionsSchema = z.object({
  faction: z.array(z.string()).nullish(),
  investigator: z.record(z.string(), z.string()).nullish(),
  trait: z.array(z.string()).nullish(),
});

export type ApiRestrictions = z.infer<typeof ApiRestrictionsSchema>;
export type ApiDeckRequirements = z.infer<typeof ApiDeckRequirementsSchema>;

export const ApiCardSchema = JsonDataCardSchema.omit({
  alternate_of: true,
  back_link: true,
  deck_requirements: true,
  duplicate_of: true,
  restrictions: true,
  side_deck_requirements: true,
  tags: true,
}).extend({
  alt_art_investigator: z.boolean().nullish(),
  alternate_of_code: z.string().nullish(),
  back_link_id: z.string().nullish(),
  deck_requirements: ApiDeckRequirementsSchema.nullish(),
  duplicate_of_code: z.string().nullish(),
  id: z.string(), // {code} or {code}-{taboo_set_id}
  locale: z.string().nullish(),
  preview: z.boolean().nullish(),
  real_back_flavor: z.string().nullish(),
  real_back_name: z.string().nullish(),
  real_back_subname: z.string().nullish(),
  real_back_text: z.string().nullish(),
  real_back_traits: z.string().nullish(),
  real_customization_change: z.string().nullish(),
  real_customization_text: z.string().nullish(),
  real_flavor: z.string().nullish(),
  real_name: z.string(),
  real_slot: z.string().nullish(),
  real_subname: z.string().nullish(),
  real_taboo_text_change: z.string().nullish(),
  real_text: z.string().nullish(),
  real_traits: z.string().nullish(),
  restrictions: ApiRestrictionsSchema.nullish(),
  side_deck_requirements: ApiDeckRequirementsSchema.nullish(),
  taboo_set_id: z.number().nullish(),
  taboo_text_change: z.string().nullish(),
  taboo_xp: z.number().nullish(),
  tags: z.array(z.string()).nullish(),
});

export type ApiCard = z.infer<typeof ApiCardSchema>;

/**
 * Card as defined in fan-made content.
 */

const CardPoolExtensionSchema = z.object({
  type: z.enum(["card"]),
  selections: z.array(z.string()).optional(),
});

export const AdditionalAttributes = {
  attachments: AttachmentsSchema.nullish(),
  back_image_url: z.url().nullish(),
  back_thumbnail_url: z.url().nullish(),
  card_pool_extension: CardPoolExtensionSchema.optional(),
  image_url: z.url().nullish(),
  reprint_of: z.string().nullish(),
  taboo_xp: z.number().nullish(),
  thumbnail_url: z.url().nullish(),
};

/**
 * Card as used by the application.
 */

const CardRuntimeAttributes = {
  /* indicates the amount of xp spent on customizations for a card. only relevant in deckbuilder mode. */
  customization_xp: z.number().nullish(),
  /** marks fan-made cards */
  official: z.boolean().nullish(),
  /* copy of card attributes, can be changed by customizable or taboos */
  original: ApiCardSchema.partial().nullish(),
  /* indicates whether a card is part of a parallel investigator pack. */
  parallel: z.boolean().nullish(),
};

export const CardSchema = ApiCardSchema.extend({
  ...AdditionalAttributes,
  ...CardRuntimeAttributes,
});

export type Card = z.infer<typeof CardSchema>;
