export type Coded = {
  code: string;
};

export type DeckRequirements = {
  card: Record<string, Record<string, string>>;
  random: { value: string; target: string }[];
  size: number;
};

export type DeckOptionSelectType = "deckSize" | "faction" | "option";

export type OptionSelect = {
  name: string;
  id: string;
  size?: number;
  level: { min: number; max: number };
  trait: string[];
  type?: string[];
};

export type DeckOption = {
  // => Lola Hayes
  atleast?: {
    min: number;
    factions?: number;
    // not present in dataset, used for special case ancestral knowledge.
    types?: number;
  };
  // => Mandy Thompson
  deck_size_select?: number | number[];
  // => Tony Morgan
  faction_select?: string[];
  // => 5 / 2 deck building
  faction?: string[];
  // => charlie kane's faction_selects
  id?: string;
  // => 5 / 2 deck building
  level?: {
    min: number;
    max: number;
  };
  // => suzie.
  base_level?: {
    min: number;
    max: number;
  };
  // => e.g. Dunwich.
  limit?: number;
  // => Investigators with deck options
  name?: string;
  // => Preston Fairmont
  not?: boolean;
  // => Suzie
  permanent?: boolean;
  // => Wendy (Parallel)
  option_select?: OptionSelect[];
  // => Carolyn / Vincent
  tag?: string[];
  // => Allesandra
  text?: string[];
  // => Silas, Mark
  trait?: string[];
  // => Tony (select), Amanda (static)
  type?: string[];
  // => Akachi
  uses?: string[];
  error?: string;
  // not present in dataset, special case on your own.
  slot?: string[];
  virtual?: boolean;
  // custom content
  text_exact?: string[];
};

export type CustomizationOption = {
  card?: {
    type: string[];
    trait: string[];
  };
  choice?: "choose_card" | "choose_trait" | "remove_slot" | "choose_skill";
  cost?: number;
  deck_limit?: number;
  health?: number;
  position?: number;
  quantity?: number;
  real_slot?: string;
  real_text?: string;
  real_traits?: string;
  sanity?: number;
  tags?: string[];
  text_change: "append" | "insert" | "replace";
  xp: number;
};

/**
 * Represents a card as defined in the ArkhamDB JSON data.
 * This format differs slightly from the API representation that is sourced from ArkhamCards.
 */
export type JsonDataCard = {
  alternate_of?: string;
  back_flavor?: string;
  back_illustrator?: string;
  back_link?: string;
  back_name?: string;
  back_text?: string;
  back_traits?: string;
  bonded_count?: number;
  bonded_to?: string;
  clues?: number | null;
  clues_fixed?: boolean;
  code: string;
  cost?: number | null;
  customization_change?: string;
  customization_options?: CustomizationOption[];
  customization_text?: string;
  deck_requirements?: string | null;
  deck_options?: DeckOption[] | null;
  deck_limit?: number;
  doom?: number | null;
  double_sided?: boolean;
  duplicate_of?: string;
  encounter_code?: string;
  encounter_position?: number;
  errata_date?: string;
  enemy_damage?: number;
  enemy_evade?: number | null;
  enemy_fight?: number | null;
  enemy_horror?: number;
  exceptional?: boolean;
  exile?: boolean;
  faction_code: string;
  faction2_code?: string;
  faction3_code?: string;
  flavor?: string;
  health?: number | null;
  health_per_investigator?: boolean;
  hidden?: boolean;
  illustrator?: string;
  is_unique?: boolean;
  myriad?: boolean;
  name: string;
  pack_code: string;
  permanent?: boolean;
  position: number;
  quantity: number;
  restrictions?: string;
  sanity?: number;
  shroud?: number | null;
  side_deck_options?: DeckOption[];
  side_deck_requirements?: string;
  skill_agility?: number;
  skill_combat?: number;
  skill_intellect?: number;
  skill_willpower?: number;
  skill_wild?: number;
  slot?: string;
  stage?: number;
  subname?: string;
  subtype_code?: string;
  tags?: string;
  text?: string;
  traits?: string;
  type_code: string;
  vengeance?: number;
  victory?: number;
  xp?: number;
};

export type APICard = Omit<
  JsonDataCard,
  | "deck_requirements"
  | "alternate_of"
  | "back_link"
  | "duplicate_of"
  | "side_deck_requirements"
  | "tags"
  | "restrictions"
> & {
  alt_art_investigator?: boolean;
  alternate_of_code?: string;
  back_link_id?: string;
  deck_requirements?: DeckRequirements;
  duplicate_of_code?: string;
  id: string; // {code} or {code}-{taboo_set_id}
  linked?: boolean;
  locale?: string;
  preview?: boolean;
  real_back_flavor?: string;
  real_back_name?: string;
  real_back_text?: string;
  real_back_traits?: string;
  real_customization_change?: string;
  real_customization_text?: string;
  real_flavor?: string;
  real_name: string;
  real_slot?: string;
  real_subname?: string;
  real_taboo_text_change?: string;
  real_text?: string;
  real_traits?: string;
  restrictions?: APIRestrictions;
  side_deck_requirements?: DeckRequirements;
  taboo_xp?: number;
  taboo_set_id?: number;
  taboo_text_change?: string;
  tags?: string[]; // used for some deckbuilding restrictions like `healsHorror`.
};

export type APIRestrictions = {
  investigator?: Record<string, string>;
  trait?: string[];
};

export type Card = Omit<APICard, "id"> & {
  /* indicates whether a card is part of a parallel investigator pack. */
  parallel?: boolean;
  /* indicates the amount of xp spent on customizations for a card. only relevant in deckbuilder mode. */
  customization_xp?: number;
  /* copy of real slot, can be changed by customizable. */
  original_slot?: string;
  /* custom content may have images defined in the card data. */
  back_image_url?: string;
  image_url?: string;
  thumbnail_url?: string;
  back_thumbnail_url?: string;
  /** marks custom cards */
  official?: boolean;
};

export type JsonDataCycle = {
  code: string;
  name: string;
  position: number;
};

export type Cycle = Omit<JsonDataCycle, "name"> & {
  name?: string;
  real_name: string;
  /** Cycles may have a banner image associated with them. */
  image_url?: string;
  official?: boolean;
};

export type Faction = {
  code: string;
  name: string;
  is_primary: boolean;
};

export type JsonDataPack = {
  code: string;
  cycle_code: string;
  date_release?: string;
  name: string;
  position: number;
  size?: number;
};

export type Pack = Omit<JsonDataPack, "name"> & {
  /** Custom content may have an encounter icon in card data. */
  icon_url?: string;
  name?: string;
  official?: boolean;
  real_name: string;
  reprint?: {
    type: string; // "player" | "encounter" | "rcore"
  };
};

export type SubType = {
  code: string;
  name: string;
};

export type Type = {
  code: string;
  name: string;
};

export type DataVersion = {
  card_count: number;
  cards_updated_at: string;
  locale: string;
  translation_updated_at: string;
  // ArkhamCards increments this version in reaction to breaking changes in the card data.
  version?: number;
};

export type JsonDataEncounterSet = {
  code: string;
  name: string;
  official?: boolean;
};

export type EncounterSet = JsonDataEncounterSet & {
  pack_code: string;
  /** Custom content may have an encounter icon in card data. */
  icon_url?: string;
};

export type Taboo = {
  back_text?: string;
  code: string;
  customization_change?: string;
  customization_options?: Card["customization_options"];
  customization_text?: string;
  deck_options?: Card["deck_options"];
  deck_requirements?: Card["deck_requirements"];
  exceptional?: boolean; // key of ys.
  real_back_text?: string;
  real_customization_change?: string;
  real_customization_text?: string;
  real_taboo_text_change?: string;
  real_text?: string;
  taboo_set_id: number;
  taboo_text_change?: string;
  taboo_xp?: number;
  text?: string;
};

export type TabooSet = {
  id: number;
  name: string;
  card_count: number;
  date: string;
};

export type Recommendation = {
  card_code: string;
  recommendation: number;
  ordering: number;
  explanation: string;
};

export type Recommendations = {
  decks_analyzed: number;
  recommendations: Recommendation[];
};
