import type { ChangeRecord } from "../lib/deck-edits";
import type { Deck, Id } from "../schemas/deck.schema";

type UndoEntry = {
  changes: ChangeRecord;
  date_update: string;
  version: string;
};

export type Folder = {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  parent_id?: string;
};

type DataState = {
  decks: Record<string, Deck>;
  folders: Record<string, Folder>;
  deckFolders: Record<Id, string>;
  history: {
    [id: Id]: Id[];
  };
  undoHistory?: Record<Id, UndoEntry[]>;
};

export type DataSlice = {
  data: DataState;

  addDeckToArchive(deckId: Id): Promise<void>;
  duplicateDeck(id: Id, options?: { applyEdits: boolean }): Promise<Id>;
  importDeck(code: string): Promise<void>;
  importFromFiles(files: FileList): Promise<void>;
  removeDeckFromFolder(deckId: Id): Promise<void>;
};
