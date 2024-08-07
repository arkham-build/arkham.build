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
  ACE_OF_RODS: "05040",
  ANCESTRAL_KNOWLEDGE: "07303",
  BEWITCHING: "10079",
  BURDEN_OF_DESTINY: "08015",
  FORCED_LEARNING: "08031",
  JOE_DIAMOND: "05002",
  MANDY: "06002",
  OCCULT_EVIDENCE: "06008",
  ON_YOUR_OWN: "53010",
  PARALLEL_AGNES: "90017",
  PARALLEL_JIM: "90049",
  PARALLEL_SKIDS: "90008",
  PARALLEL_ROLAND: "90024",
  PARALLEL_WENDY: "90037",
  RANDOM_BASIC_WEAKNESS: "01000",
  STICK_TO_THE_PLAN: "03264",
  UNDERWORLD_MARKET: "09077",
  UNDERWORLD_SUPPORT: "08046",
  UNSOLVED_CASE: "05010",
  VENGEFUL_SHADE: "90053",
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
