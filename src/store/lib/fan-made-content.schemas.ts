import * as z from "@zod/mini";

const ContentTypeSchema = z.enum([
  "campaign",
  "investigators",
  "player_cards",
  "rework",
  "scenario",
]);

const StatusSchema = z.enum(["draft", "alpha", "beta", "complete", "final"]);

// FIXME: zod v4 currently does not accept const arrays (FACTION_ORDER): https://github.com/colinhacks/zod/issues/4086
const FactionSchema = z.enum([
  "guardian",
  "seeker",
  "rogue",
  "mystic",
  "survivor",
  "neutral",
  "mythos",
]);

// FIXME: zod v4 currently does not accept const arrays (PLAYER_TYPE_ORDER): https://github.com/colinhacks/zod/issues/4086
const CardTypeSchema = z.enum([
  "investigator",
  "asset",
  "event",
  "skill",
  "location",
  "enemy",
  "enemy_location",
  "key",
  "treachery",
  "scenario",
  "act",
  "agenda",
  "story",
]);

const SubtypeSchema = z.enum(["basicweakness", "weakness"]);

const ProjectMetaSchema = z.object({
  author: z.string().register(z.globalRegistry, {
    description: "Author of the project.",
  }),
  banner_url: z.optional(z.string()).register(z.globalRegistry, {
    description: "URL to a banner image. Ideal dimensions: 1180x500.",
  }),
  code: z.string().check(z.minLength(3)).register(z.globalRegistry, {
    description:
      " Unique identifier for the project. a UUID when created by Zoop.",
  }),
  date_updated: z.optional(z.string()).register(z.globalRegistry, {
    description:
      "Date when this content was last updated, as ISO 8601 datestamp.",
  }),
  description: z.optional(z.string()).register(z.globalRegistry, {
    description: "Detailed (Markdown) description for the project.",
  }),
  external_link: z
    .optional(z.union([z.url(), z.literal("")]))
    .register(z.globalRegistry, {
      description: "URL to an external project page.",
    }),
  language: z.string().register(z.globalRegistry, {
    description: "Language of the project as ISO 639-1 language code.",
  }),
  name: z.string().register(z.globalRegistry, {
    description: "Name of the project.",
  }),
  status: z.optional(StatusSchema).register(z.globalRegistry, {
    description:
      'Project status. If not specified, project is assumed to be "final".',
  }),
  tags: z.optional(z.array(z.string())).register(z.globalRegistry, {
    description: "List of tags for the project. (English)",
  }),
  types: z.optional(z.array(ContentTypeSchema)).register(z.globalRegistry, {
    description: "List of content types that the project contains.",
  }),
  url: z.optional(z.url()).register(z.globalRegistry, {
    description:
      "URL to where the project (=this file) is hosted. Used to fetch updates. Null for local packs.",
  }),
});

const FanMadeEncounterSetSchema = z.object({
  code: z.string(),
  name: z.string(),
  icon_url: z.optional(z.url()),
});

const FanMadePackSchema = z.object({
  code: z.string(),
  icon_url: z.optional(z.url()),
  name: z.string(),
  position: z.optional(z.number()),
});

const FanMadeCardSchema = z.object({
  back_flavor: z.optional(z.string()),
  back_illustrator: z.optional(z.string()),
  back_image_url: z.optional(z.url()),
  back_link: z.optional(z.string()),
  back_name: z.optional(z.string()),
  back_text: z.optional(z.string()),
  back_thumbnail_url: z.optional(z.url()),
  back_traits: z.optional(z.string()),
  bonded_count: z.optional(z.number()),
  bonded_to: z.optional(z.string()),
  clues: z.optional(z.nullable(z.number())),
  clues_fixed: z.optional(z.boolean()),
  code: z.string(),
  cost: z.optional(z.nullable(z.number())),
  // not supported right now. TODO: review if the logic is generic enough.
  // customization_change: z.optional(z.string()),
  // customization_options: z.optional(z.array(z.looseObject({}))),
  // customization_text: z.optional(z.string()),
  deck_requirements: z.optional(z.nullable(z.string())),
  deck_options: z.optional(z.nullable(z.array(z.looseObject({})))),
  deck_limit: z.optional(z.number()),
  doom: z.optional(z.nullable(z.number())),
  double_sided: z.optional(z.boolean()),
  encounter_code: z.optional(z.string()),
  encounter_position: z.optional(z.number()),
  enemy_damage: z.optional(z.number()),
  enemy_evade: z.optional(z.nullable(z.number())),
  enemy_fight: z.optional(z.nullable(z.number())),
  enemy_horror: z.optional(z.number()),
  exceptional: z.optional(z.boolean()),
  exile: z.optional(z.boolean()),
  faction_code: FactionSchema,
  faction2_code: z.optional(FactionSchema),
  faction3_code: z.optional(FactionSchema),
  flavor: z.optional(z.string()),
  health: z.optional(z.nullable(z.number())),
  health_per_investigator: z.optional(z.boolean()),
  hidden: z.optional(z.boolean()),
  illustrator: z.optional(z.string()),
  image_url: z.optional(z.url()),
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
  // not supported right now. TODO: review if the logic is generic enough.
  // side_deck_options: z.optional(z.array(z.looseObject({}))),
  // side_deck_requirements: z.optional(z.string()),
  skill_agility: z.optional(z.number()),
  skill_combat: z.optional(z.number()),
  skill_intellect: z.optional(z.number()),
  skill_willpower: z.optional(z.number()),
  skill_wild: z.optional(z.number()),
  slot: z.optional(z.string()),
  stage: z.optional(z.number()),
  subname: z.optional(z.string()),
  subtype_code: z.optional(SubtypeSchema),
  tags: z.optional(z.string()),
  text: z.optional(z.string()),
  thumbnail_url: z.optional(z.url()),
  traits: z.optional(z.string()),
  type_code: CardTypeSchema,
  vengeance: z.optional(z.number()),
  victory: z.optional(z.number()),
  xp: z.optional(z.number()),
});

export const FanMadeProjectSchema = z.object({
  meta: ProjectMetaSchema,
  data: z.object({
    cards: z.array(FanMadeCardSchema),
    encounter_sets: z.array(FanMadeEncounterSetSchema),
    packs: z.array(FanMadePackSchema),
  }),
});

export type FanMadeProject = z.infer<typeof FanMadeProjectSchema>;

export type FanMadeCard = z.infer<typeof FanMadeCardSchema>;

export type FanMadePack = z.infer<typeof FanMadePackSchema>;

export type FanMadeEncounterSet = z.infer<typeof FanMadeEncounterSetSchema>;
