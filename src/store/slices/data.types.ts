import type { ChangeRecord } from "../lib/deck-edits";
import type { Provider } from "./connections.types";

export type Slots = {
  [code: string]: number;
};

export type Id = number | string;

export type DeckProblem =
  | "too_few_cards"
  | "too_many_cards"
  | "too_many_copies"
  | "invalid_cards"
  | "deck_options_limit"
  | "investigator";

export type Deck = {
  date_creation: string;
  date_update: string;
  exile_string: string | null;
  description_md: string;
  ignoreDeckLimitSlots: Slots | null;
  id: Id;
  investigator_code: string;
  investigator_name: string;
  meta: string;
  name: string;
  next_deck: Id | null;
  previous_deck: Id | null;
  problem?: DeckProblem | string | null;
  sideSlots: Slots | string[]; // NOTE: arkhamdb returns `[]` for empty side slots.
  slots: Slots;
  source?: Provider | undefined;
  taboo_id: number | null;
  tags: string;
  user_id?: number | null;
  version: string;
  xp_adjustment: number | null;
  xp_spent: number | null;
  xp: number | null;
};

export function isDeck(x: unknown): x is Deck {
  return (
    typeof x === "object" && x !== null && "id" in x && "investigator_code" in x
  );
}

type UndoEntry = {
  changes: ChangeRecord;
  date_update: string;
  version: string;
};

type DataState = {
  decks: Record<string, Deck>;
  history: {
    [id: Id]: Id[];
  };
  undoHistory?: Record<Id, UndoEntry[]>;
};

export type DataSlice = {
  data: DataState;
  duplicateDeck(id: Id, options?: { applyEdits: boolean }): Promise<Id>;
  importDeck(code: string): Promise<void>;
  importFromFiles(files: FileList): Promise<void>;
};
