export const COMPARISON_OPERATOR = ["=", "!="] as const;

export const DECKLIST_SEARCH_MAX_XP = 50;

export const SPECIAL_CARD_CODES = {
  /** Can be in ignore deck limit slots for TCU. */
  ACE_OF_RODS: "05040",
  /** Changes XP calculation for upgrades. */
  ADAPTABLE: "02110",
  /** Changes XP calculation for upgrades. */
  ARCANE_RESEARCH: "04109",
  /** Quantity scales with signature count. */
  BURDEN_OF_DESTINY: "08015",
  /** Allows to exile arbitrary cards. */
  BURN_AFTER_READING: "08076",
  /** Additional XP gain. */
  CHARONS_OBOL: "03308",
  /** Changes XP calculation for upgrades. */
  DEJA_VU: "60531",
  /** Connected to parallel roland's front. */
  DIRECTIVE: "90025",
  /** Changes XP calculation for upgrades. */
  DOWN_THE_RABBIT_HOLE: "08059",
  /** Has additional deck validation rule. */
  ELDRITCH_BRAND: "11080",
  /** Has deck size selection (and accompanying taboo). */
  MANDY: "06002",
  /** Scales with investigator deck size selection. */
  OCCULT_EVIDENCE: "06008",
  /** Fake-bonded card, should be excluded from things liks draw simulator. */
  ON_THE_MEND: "09006",
  /** Has spirit deck. */
  PARALLEL_JIM: "90049",
  /** Parallel front has deckbuilding impact. */
  PARALLEL_ROLAND: "90024",
  /** Parallel front has deckbuilding impact. */
  PARALLEL_WENDY: "90037",
  /** Special case for deck limit (considers subname). */
  PRECIOUS_MEMENTOS: ["08114", "08115"],
  /** Random basic weakness placeholder. */
  RANDOM_BASIC_WEAKNESS: "01000",
  /** Separate upgrade path. */
  SHREWD_ANALYSIS: "04106",
  /** Additional XP gain, switches deck investigator with a static investigator on defeat. */
  THE_GREAT_WORK: "11068a",
  /** Investigator can be transformed into this. */
  LOST_HOMUNCULUS: "11068b",
  /** Additional deck building not reflected in deck options. */
  SUZI: "89001",
  /** Connected to parallel wendy's front. */
  TIDAL_MEMENTO: "90038",
  /** adds deckbuilding requirements. */
  UNDERWORLD_SUPPORT: "08046",
  /** Exceptions for specialist logic. */
  GENERIC_CUSTOM_INVESTIGATORS: [
    "347ff5d0-8521-4d9b-a0fe-90c06114057d",
    "c13c4114-0769-410c-864b-e43f5a596c0d",
  ],
};

export type SkillKey =
  | "agility"
  | "combat"
  | "intellect"
  | "willpower"
  | "wild";

export const SKILL_KEYS: SkillKey[] = [
  "willpower",
  "intellect",
  "combat",
  "agility",
  "wild",
] as const;

export type PlayerType =
  | "investigator"
  | "asset"
  | "event"
  | "skill"
  | "location"
  | "story"
  | "treachery"
  | "enemy"
  | "key";

export const PLAYER_TYPE_ORDER = [
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
] as const;

export const ASSET_SLOT_ORDER = [
  "Hand",
  "Hand x2",
  "Accessory",
  "Ally",
  "Arcane",
  "Arcane x2",
  "Head",
  "Body",
  "Tarot",
  // followed by:
  // - multi_slot
  // - permanent
  // - Other
];

const SKILL_ICONS = [
  "skill_agility",
  "skill_combat",
  "skill_intellect",
  "skill_willpower",
  "skill_wild",
] as const;

export type SkillIcon = (typeof SKILL_ICONS)[number];

export const FACTION_ORDER = [
  "guardian",
  "seeker",
  "rogue",
  "mystic",
  "survivor",
  "neutral",
  "mythos",
  "multiclass",
] as const;

export type FactionName = (typeof FACTION_ORDER)[number];

export type OAuthConnection = {
  provider: string;
  icon: string;
};

export const OAUTH_CONNECTIONS = [
  {
    provider: "arkhamdb",
    icon: "icon-elder_sign",
  },
];
