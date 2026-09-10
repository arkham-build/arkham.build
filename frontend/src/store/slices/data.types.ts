import type { Deck, Id } from "@arkham-build/shared";
import type { ChangeRecord } from "../lib/deck-edits";
import type { HttpClient } from "../services/http-client";

export type UndoEntry = {
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

  duplicateDeck(id: Id, options?: { applyEdits: boolean }): Promise<Id>;
  importDeck(client: HttpClient, code: string): Promise<void>;
  importFromFiles(files: FileList): Promise<void>;
  removeDeckFromFolder(client: HttpClient, deckId: Id): Promise<void>;
  setDeckFolder(
    client: HttpClient | undefined,
    deckId: Id,
    folderId: string | null,
  ): Promise<void>;
};
