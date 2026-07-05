import type {
  Attachments,
  Card,
  Cycle,
  Deck,
  DeckFanMadeContent,
  DeckMeta,
  EncounterSet,
  FactionName,
  JsonDataSubtype,
  JsonDataType,
  OptionSelect,
  Pack,
  SealedDeckResponse,
  SkillIcon,
  TabooSet,
} from "@arkham-build/shared";
import type { AttachmentQuantities } from "../slices/deck-edits.types";

export type Coded = {
  code: string;
};

export type ResolvedCard = {
  card: Card;
  back?: ResolvedCard;
  encounterSet?: EncounterSet;
  cycle: Cycle;
  pack: Pack;
  subtype?: JsonDataSubtype;
  type: JsonDataType;
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
    sideDeckRequiredCards?: ResolvedCard[];
    parallelCards?: ResolvedCard[];
    duplicates?: ResolvedCard[];
    reprints?: ResolvedCard[];
    otherVersions?: ResolvedCard[];

    level?: ResolvedCard[];

    // For signature -> signature navigation.
    otherSignatures?: ResolvedCard[];
  };
};

export type Customization = {
  index: number;
  xp_spent: number;
  selections?: string;
};

export type Customizations = Record<
  string,
  Record<number | string, Customization>
>;

type DeckSizeSelection = {
  type: "deckSize";
  value: number;
  options: string[];
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
  costs: number[];
  skillIcons: Map<SkillIcon, number>;
  factions: Map<FactionName, number>;
  traits: Map<string, number>;
};

export type Annotations = Record<string, string | null>;

export type DeckCardTags = Record<string, string[]>;

export type ResolvedDeck = Omit<Deck, "sideSlots"> & {
  annotations: Annotations;
  attachments: AttachmentQuantities | undefined;
  availableAttachments: Attachments[];
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
  deckCardTags: DeckCardTags;
  metaParsed: DeckMeta;
  customizations?: Customizations;
  fanMadeData?: DeckFanMadeContent;
  investigatorFront: CardWithRelations;
  investigatorBack: CardWithRelations;
  hasExtraDeck: boolean;
  hasReplacements: boolean;
  hasParallel: boolean;
  otherInvestigatorVersion?: ResolvedCard;
  originalDeck: Deck;
  sealedDeck?: SealedDeckResponse;
  selections?: Selections;
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

export type DeckSummary = Pick<
  Deck,
  | "date_creation"
  | "date_update"
  | "id"
  | "name"
  | "problem"
  | "source"
  | "tags"
  | "xp"
  | "xp_adjustment"
  | "slots"
> &
  Pick<
    ResolvedDeck,
    | "investigatorFront"
    | "investigatorBack"
    | "cardPool"
    | "extraSlots"
    | "hasParallel"
    | "sealedDeck"
    | "sideSlots"
  > & {
    stats: Omit<ResolvedDeck["stats"], "charts">;
  };

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
