import type {
  AttachableDefinition,
  FactionName,
  SkillIcon,
} from "@/utils/constants";
import type {
  Card,
  Cycle,
  EncounterSet,
  OptionSelect,
  Pack,
  SubType,
  TabooSet,
  Type,
} from "../services/queries.types";
import type { Deck } from "../slices/data.types";
import type { AttachmentQuantities } from "../slices/deck-edits.types";

export type SealedDeck = {
  name: string;
  cards: Record<string, number>;
};

export type ResolvedCard = {
  card: Card;
  back?: ResolvedCard;
  encounterSet?: EncounterSet;
  cycle: Cycle;
  pack: Pack;
  subtype?: SubType;
  type: Type;
};

export type CardWithRelations = ResolvedCard & {
  relations?: {
    bound?: ResolvedCard[];
    bonded?: ResolvedCard[];

    restrictedTo?: ResolvedCard[];
    parallel?: ResolvedCard;
    base?: ResolvedCard;

    advanced?: ResolvedCard[];
    replacement?: ResolvedCard[];
    requiredCards?: ResolvedCard[];
    parallelCards?: ResolvedCard[];
    duplicates?: ResolvedCard[];
    otherVersions?: ResolvedCard[];

    level?: ResolvedCard[];

    // For signature -> signature navigation.
    otherSignatures?: ResolvedCard[];
  };
};

export function isCardWithRelations(
  x: ResolvedCard | CardWithRelations,
): x is CardWithRelations {
  return "relations" in x;
}

export type Customization = {
  index: number;
  xp_spent: number;
  selections?: string;
};

export type Customizations = Record<
  string,
  Record<number | string, Customization>
>;

export type DeckMeta = {
  alternate_back?: string | null;
  alternate_front?: string | null;
  card_pool?: string | null;
  deck_size_selected?: string | null;
  extra_deck?: string | null;
  fan_made_content?: {
    cards: Record<string, Card>;
    cycles: Record<string, Cycle>;
    encounter_sets: Record<string, EncounterSet>;
    packs: Record<string, Pack>;
  };
  faction_1?: string | null;
  faction_2?: string | null;
  faction_selected?: string | null;
  option_selected?: string | null;
  sealed_deck_name?: string | null;
  sealed_deck?: string | null;
  transform_into?: string | null;
  banner_url?: string | null;
  intro_md?: string | null;
} & {
  [key in `cus_${string}`]: string | null;
} & {
  [key in `attachments_${string}`]: string | null;
} & {
  [key in `annotation_${string}`]: string | null;
};

type DeckSizeSelection = {
  type: "deckSize";
  value: number;
  options: number[];
  name: string;
  accessor: string;
};

type FactionSelection = {
  type: "faction";
  value?: string;
  options: string[];
  name: string;
  accessor: string;
};

type OptionSelection = {
  type: "option";
  value?: OptionSelect;
  options: OptionSelect[];
  name: string;
  accessor: string;
};

export function isOptionSelect(x: unknown): x is OptionSelect {
  return typeof x === "object" && x != null && "id" in x;
}

export type Selection = OptionSelection | FactionSelection | DeckSizeSelection;

// selections, keyed by their `id`, or if not present their `name`.
export type Selections = Record<string, Selection>;

export type DeckCharts = {
  costCurve: Map<number, number>;
  skillIcons: Map<SkillIcon, number>;
  factions: Map<FactionName, number>;
  traits: Map<string, number>;
};

export type Annotations = Record<string, string | null>;

export type ResolvedDeck = Omit<Deck, "sideSlots"> & {
  annotations: Annotations;
  attachments: AttachmentQuantities | undefined;
  availableAttachments: AttachableDefinition[];
  bondedSlots: Record<string, number>;
  sideSlots: Record<string, number> | null; // arkhamdb stores `[]` when empty, normalize to `null`.
  extraSlots: Record<string, number> | null;
  exileSlots: Record<string, number>;
  cards: {
    bondedSlots: Record<string, ResolvedCard>;
    exileSlots: Record<string, ResolvedCard>;
    extraSlots: Record<string, ResolvedCard>; // used by parallel jim.
    ignoreDeckLimitSlots: Record<string, ResolvedCard>;
    investigator: CardWithRelations; // tracks relations.
    sideSlots: Record<string, ResolvedCard>;
    slots: Record<string, ResolvedCard>;
  };
  cardPool?: string[];
  metaParsed: DeckMeta;
  customizations?: Customizations;
  fanMadeData?: DeckMeta["fan_made_content"];
  investigatorFront: CardWithRelations;
  investigatorBack: CardWithRelations;
  hasExtraDeck: boolean;
  hasReplacements: boolean;
  hasParallel: boolean;
  otherInvestigatorVersion?: ResolvedCard;
  originalDeck: Deck;
  sealedDeck?: SealedDeck;
  selections?: Selections;
  shared: boolean;
  stats: {
    xpRequired: number;
    deckSize: number;
    deckSizeTotal: number;
    charts: DeckCharts;
  };
  tabooSet?: TabooSet;
};

export function isResolvedDeck(a: unknown): a is ResolvedDeck {
  return (a as ResolvedDeck)?.investigatorFront != null;
}

export type CardSet = {
  canSetQuantity?: boolean;
  canSelect?: boolean;
  cards: ResolvedCard[];
  id: string;
  quantities?: Record<string, number>;
  selected: boolean;
  title: string;
  help?: string;
};
