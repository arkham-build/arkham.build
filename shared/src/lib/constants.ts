export const COMPARISON_OPERATOR = ["=", "!="] as const;

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
