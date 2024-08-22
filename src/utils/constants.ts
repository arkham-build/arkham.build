export const FLOATING_PORTAL_ID = "floating";

export const ISSUE_URL =
  "https://github.com/fspoettel/arkham.build/issues/new/choose";

export const REGEX_SKILL_BOOST = /\+\d+?\s\[(.+?)\]/g;

export const REGEX_USES = /Uses\s\(\d+?\s(\w+?)\)/;

export const REGEX_BONDED = /^Bonded\s\((.*?)\)(\.|\s)/;

export const REGEX_SUCCEED_BY =
  /succe(ssful|ed(?:s?|ed?))(:? at a skill test)? by(?! 0)/;

export const REGEX_WEAKNESS_FACTION_LOCKED = /^\[(.*?)\] investigator only\./;

const ACTION_TEXT: { [key: string]: string } = {
  fight: "Fight.",
  engage: "Engage.",
  investigate: "Investigate.",
  play: "Play.",
  draw: "Draw.",
  move: "Move.",
  evade: "Evade.",
  parley: "Parley.",
} as const;

export const ACTION_TEXT_ENTRIES = Object.entries(ACTION_TEXT);

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
  "Body",
  "Tarot",
  // followed by:
  // - multi_slot
  // - permanent
  // - Other
];

export const FACTION_ORDER = [
  "guardian",
  "seeker",
  "rogue",
  "mystic",
  "survivor",
  "multiclass",
  "neutral",
  "mythos",
];

export const SIDEWAYS_TYPE_CODES = ["act", "agenda", "investigator"];

export const CYCLES_WITH_STANDALONE_PACKS = [
  "core",
  "return",
  "investigator",
  "promotional",
  "parallel",
  "side_stories",
];

export const ALT_ART_INVESTIGATOR_MAP = {
  "98001": "02003",
  "98004": "01001",
  "98007": "08004",
  "98010": "05001",
  "98013": "07005",
  "98016": "07004",
};

export const SPECIAL_CARD_CODES = {
  /** Can be in ignore deck limit slots for TCU. */
  ACE_OF_RODS: "05040",
  /** Changes XP calculation for upgrades. */
  ADAPTABLE: "02110",
  /** Adjusts deck size, has separate deck. */
  ANCESTRAL_KNOWLEDGE: "07303",
  /** Changes XP calculation for upgrades. */
  ARCANE_RESEARCH: "04109",
  /** Has separate deck. */
  BEWITCHING: "10079",
  /** Quantity scales with signature count. */
  BURDEN_OF_DESTINY: "08015",
  /** Allows to exile arbitrary cards. */
  BURN_AFTER_READING: "08076",
  /** Changes XP calculation for upgrades. */
  DEJA_VU: "60531",
  /** Changes XP calculation for upgrades. */
  DOWN_THE_RABBIT_HOLE: "08059",
  /** Adjusts deck size. */
  FORCED_LEARNING: "08031",
  /** Has separate deck. */
  JOE_DIAMOND: "05002",
  /** Has deck size selection (and accompanying taboo). */
  MANDY: "06002",
  /** Scales with investigator deck size selection. */
  OCCULT_EVIDENCE: "06008",
  /** Adds deckbuilding restriction. */
  ON_YOUR_OWN: "53010",
  /** Has option to add cards to ignore deck limit slots. */
  PARALLEL_AGNES: "90017",
  /** Has spirit deck. */
  PARALLEL_JIM: "90049",
  /** Has option to add cards to ignore deck limit slots. */
  PARALLEL_SKIDS: "90008",
  /** Parallel front has deckbuilding impact. */
  PARALLEL_ROLAND: "90024",
  /** Parallel front has deckbuilding impact. */
  PARALLEL_WENDY: "90037",
  /** Random basic weakness placeholder. */
  RANDOM_BASIC_WEAKNESS: "01000",
  /** Separate deck. */
  STICK_TO_THE_PLAN: "03264",
  /** Adjusts deck size, has separate deck. */
  UNDERWORLD_MARKET: "09077",
  /** adds deckbuilding requirements. */
  UNDERWORLD_SUPPORT: "08046",
  /** Weakness starts in hunch deck. */
  UNSOLVED_CASE: "05010",
  /** Weakness starts in spirit deck. */
  VENGEFUL_SHADE: "90053",
  /** Adds deckbuilding restriction, adjusts deck size. */
  VERSATILE: "06167",
};

export const CARD_SET_ORDER = [
  "base",
  "parallel",
  "requiredCards",
  "advanced",
  "replacement",
  "parallelCards",
  "bound",
  "bonded",
  "level",
];

type SeparateDeckDefinition = {
  icon: string;
  traits?: string[];
  typeCodes?: string[];
  targetSize: number;
  requiredCards?: string[];
  selection: "choice" | "random";
};

/**
 * A separate deck is a deck that is constructed during the scenario setup.
 * This excludes Parallel Jim's spirit deck, which cannot change between scenarios.
 */
export const CARDS_SEPARATE_DECKS: { [code: string]: SeparateDeckDefinition } =
  {
    [SPECIAL_CARD_CODES.ANCESTRAL_KNOWLEDGE]: {
      typeCodes: ["skill"],
      icon: "brain",
      targetSize: 5,
      selection: "random",
    },
    [SPECIAL_CARD_CODES.BEWITCHING]: {
      traits: ["trick"],
      icon: "wand-sparkles",
      targetSize: 3,
      selection: "choice",
    },
    [SPECIAL_CARD_CODES.JOE_DIAMOND]: {
      traits: ["insight"],
      icon: "lightbulb",
      targetSize: 11,
      requiredCards: [SPECIAL_CARD_CODES.UNSOLVED_CASE],
      selection: "choice",
    },
    [SPECIAL_CARD_CODES.STICK_TO_THE_PLAN]: {
      traits: ["tactic", "supply"],
      icon: "package",
      targetSize: 3,
      selection: "choice",
    },
    [SPECIAL_CARD_CODES.UNDERWORLD_MARKET]: {
      traits: ["illicit"],
      icon: "store",
      targetSize: 10,
      selection: "choice",
    },
  };

export const DECK_SIZE_ADJUSTMENTS = {
  [SPECIAL_CARD_CODES.ANCESTRAL_KNOWLEDGE]: 5,
  [SPECIAL_CARD_CODES.FORCED_LEARNING]: 15,
  [SPECIAL_CARD_CODES.UNDERWORLD_MARKET]: 10,
  [SPECIAL_CARD_CODES.UNDERWORLD_SUPPORT]: -5,
  [SPECIAL_CARD_CODES.VERSATILE]: 5,
};

export const CARDS_WITH_LOCAL_IMAGES: Record<string, boolean> = {
  "90084": true,
  "90085": true,
  "90086": true,
};
