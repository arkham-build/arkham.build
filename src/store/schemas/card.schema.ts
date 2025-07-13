import * as z from "zod/v4-mini";
import {
  COMPARISON_OPERATOR,
  FACTION_ORDER,
  PLAYER_TYPE_ORDER,
} from "@/utils/constants";

/* Attachments */

const AttributeFilterSchema = z.object({
  attribute: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  operator: z.optional(z.enum(COMPARISON_OPERATOR)),
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
    limit: z.optional(z.number()).register(z.globalRegistry, {
      description:
        "Maximum number of copies of a single card in this attachment.",
    }),
    requiredCards: z.optional(
      z.record(z.string(), z.number()).register(z.globalRegistry, {
        description:
          "Cards that are required to be in the deck for this attachment to be valid.",
      }),
    ),
    targetSize: z.number().register(z.globalRegistry, {
      description: "Number of cards that can be attached to this card.",
    }),
    traits: z.optional(z.array(z.string())).register(z.globalRegistry, {
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

const CustomizationTextChange = z.enum(["append", "insert", "replace"]);

const CustomizationOptionSchema = z.object({
  card: z.optional(
    z.object({
      type: z.optional(z.array(z.string())),
      trait: z.optional(z.array(z.string())),
    }),
  ),
  choice: z.optional(CustomizationChoice),
  cost: z.optional(z.number()),
  deck_limit: z.optional(z.number()),
  health: z.optional(z.number()),
  position: z.optional(z.number()),
  quantity: z.optional(z.number()),
  real_slot: z.optional(z.string()),
  real_text: z.optional(z.string()),
  real_traits: z.optional(z.string()),
  sanity: z.optional(z.number()),
  tags: z.optional(z.array(z.string())),
  text_change: CustomizationTextChange,
  xp: z.number(),
});

export type CustomizationOption = z.infer<typeof CustomizationOptionSchema>;

/* Deck Options */

const AtLeastSchema = z.object({
  factions: z.optional(z.number()),
  min: z.number(),
  types: z.optional(z.number()),
});

const OptionSelectSchema = z.object({
  id: z.string(),
  level: z.object({
    min: z.number(),
    max: z.number(),
  }),
  name: z.string(),
  size: z.optional(z.number()),
  trait: z.optional(z.array(z.string())),
  type: z.optional(z.array(z.string())),
});

export type OptionSelect = z.infer<typeof OptionSelectSchema>;

const DeckOptionSchema = z.object({
  atleast: z.optional(AtLeastSchema),
  base_level: z.optional(z.object({ min: z.number(), max: z.number() })),
  deck_size_select: z.optional(z.union([z.number(), z.array(z.number())])),
  error: z.optional(z.string()),
  faction_select: z.optional(z.array(z.string())),
  faction: z.optional(z.array(z.string())),
  id: z.optional(z.string()),
  level: z.optional(z.object({ min: z.number(), max: z.number() })),
  limit: z.optional(z.number()),
  name: z.optional(z.string()),
  not: z.optional(z.boolean()),
  option_select: z.optional(z.array(OptionSelectSchema)),
  permanent: z.optional(z.boolean()),
  slot: z.optional(z.array(z.string())),
  tag: z.optional(z.array(z.string())),
  text_exact: z.optional(z.array(z.string())),
  text: z.optional(z.array(z.string())),
  trait: z.optional(z.array(z.string())),
  type: z.optional(z.array(z.string())),
  uses: z.optional(z.array(z.string())),
  virtual: z.optional(z.boolean()),
});

export type DeckOption = z.infer<typeof DeckOptionSchema>;

export type DeckOptionSelectType = "deckSize" | "faction" | "option";

/**
 * ArkhamDB JSON data schema.
 */

const Faction = z.enum(FACTION_ORDER);

const JsonDataCardSchema = z.object({
  alternate_of: z.optional(z.string()),
  back_flavor: z.optional(z.string()),
  back_illustrator: z.optional(z.string()),
  back_link: z.optional(z.string()),
  back_name: z.optional(z.string()),
  back_text: z.optional(z.string()),
  back_traits: z.optional(z.string()),
  bonded_count: z.optional(z.number()),
  bonded_to: z.optional(z.string()),
  clues_fixed: z.optional(z.boolean()),
  clues: z.optional(z.number()),
  code: z.string(),
  cost: z.optional(z.nullable(z.number())),
  customization_change: z.optional(z.string()),
  customization_options: z.optional(z.array(CustomizationOptionSchema)),
  customization_text: z.optional(z.string()),
  deck_limit: z.optional(z.number()),
  deck_options: z.optional(z.array(DeckOptionSchema)),
  deck_requirements: z.optional(z.nullable(z.string())),
  doom: z.optional(z.nullable(z.number())),
  double_sided: z.optional(z.boolean()),
  duplicate_of: z.optional(z.string()),
  encounter_code: z.optional(z.string()),
  encounter_position: z.optional(z.number()),
  enemy_damage: z.optional(z.number()),
  enemy_evade: z.optional(z.nullable(z.number())),
  enemy_fight: z.optional(z.nullable(z.number())),
  enemy_horror: z.optional(z.number()),
  errata_date: z.optional(z.string()),
  exceptional: z.optional(z.boolean()),
  exile: z.optional(z.boolean()),
  faction_code: Faction,
  faction2_code: z.optional(Faction),
  faction3_code: z.optional(Faction),
  flavor: z.optional(z.string()),
  health_per_investigator: z.optional(z.boolean()),
  health: z.optional(z.nullable(z.number())),
  hidden: z.optional(z.boolean()),
  illustrator: z.optional(z.string()),
  is_unique: z.optional(z.boolean()),
  myriad: z.optional(z.boolean()),
  name: z.string(),
  pack_code: z.string(),
  permanent: z.optional(z.boolean()),
  position: z.number(),
  quantity: z.number(),
  restrictions: z.optional(z.string()),
  sanity: z.optional(z.number()),
  shroud: z.optional(z.nullable(z.number())),
  side_deck_options: z.optional(z.array(DeckOptionSchema)),
  side_deck_requirements: z.optional(z.string()),
  skill_agility: z.optional(z.number()),
  skill_combat: z.optional(z.number()),
  skill_intellect: z.optional(z.number()),
  skill_wild: z.optional(z.number()),
  skill_willpower: z.optional(z.number()),
  slot: z.optional(z.string()),
  stage: z.optional(z.number()),
  subname: z.optional(z.string()),
  subtype_code: z.optional(z.enum(["basicweakness", "weakness"])),
  tags: z.optional(z.string()),
  text: z.optional(z.string()),
  traits: z.optional(z.string()),
  type_code: z.enum(PLAYER_TYPE_ORDER),
  vengeance: z.optional(z.number()),
  victory: z.optional(z.number()),
  xp: z.optional(z.number()),
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
  investigator: z.optional(z.record(z.string(), z.string())),
  trait: z.optional(z.array(z.string())),
});

export type ApiRestrictions = z.infer<typeof ApiRestrictionsSchema>;
export type ApiDeckRequirements = z.infer<typeof ApiDeckRequirementsSchema>;

export const ApiCardSchema = z.extend(
  z.omit(JsonDataCardSchema, {
    alternate_of: true,
    back_link: true,
    deck_requirements: true,
    duplicate_of: true,
    restrictions: true,
    side_deck_requirements: true,
    tags: true,
  }),
  {
    alt_art_investigator: z.optional(z.boolean()),
    alternate_of_code: z.optional(z.string()),
    back_link_id: z.optional(z.string()),
    deck_requirements: z.optional(ApiDeckRequirementsSchema),
    duplicate_of_code: z.optional(z.string()),
    id: z.string(), // {code} or {code}-{taboo_set_id}
    linked: z.optional(z.boolean()),
    locale: z.optional(z.string()),
    preview: z.optional(z.boolean()),
    real_back_flavor: z.optional(z.string()),
    real_back_name: z.optional(z.string()),
    real_back_text: z.optional(z.string()),
    real_back_traits: z.optional(z.string()),
    real_customization_change: z.optional(z.string()),
    real_customization_text: z.optional(z.string()),
    real_flavor: z.optional(z.string()),
    real_name: z.string(),
    real_slot: z.optional(z.string()),
    real_subname: z.optional(z.string()),
    real_taboo_text_change: z.optional(z.string()),
    real_text: z.optional(z.string()),
    real_traits: z.optional(z.string()),
    restrictions: z.optional(ApiRestrictionsSchema),
    side_deck_requirements: z.optional(ApiDeckRequirementsSchema),
    taboo_set_id: z.optional(z.number()),
    taboo_text_change: z.optional(z.string()),
    taboo_xp: z.optional(z.number()),
    tags: z.optional(z.array(z.string())),
  },
);

export type ApiCard = z.infer<typeof ApiCardSchema>;

/**
 * Card as defined in fan-made content.
 */

const CardPoolExtensionSchema = z.object({
  type: z.enum(["card"]),
});

const AdditionalAttributes = {
  attachments: z.optional(AttachmentsSchema),
  back_image_url: z.optional(z.url()),
  back_thumbnail_url: z.optional(z.url()),
  card_pool_extension: z.optional(CardPoolExtensionSchema),
  image_url: z.optional(z.url()),
  thumbnail_url: z.optional(z.url()),
};

export const FanMadeCardSchema = z.extend(
  JsonDataCardSchema,
  AdditionalAttributes,
);

export type FanMadeCard = z.infer<typeof FanMadeCardSchema>;

/**
 * Card as used by the application.
 */

const CardRuntimeAttributes = {
  /* indicates the amount of xp spent on customizations for a card. only relevant in deckbuilder mode. */
  customization_xp: z.optional(z.number()),
  /** marks fan-made cards */
  official: z.optional(z.boolean()),
  /* copy of real slot, can be changed by customizable. */
  original_slot: z.optional(z.string()),
  /* indicates whether a card is part of a parallel investigator pack. */
  parallel: z.optional(z.boolean()),
};

const CardSchema = z.extend(ApiCardSchema, {
  ...AdditionalAttributes,
  ...CardRuntimeAttributes,
});

export type Card = z.infer<typeof CardSchema>;
