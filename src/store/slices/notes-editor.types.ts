import type { CardFormat } from "../lib/cards-to-markdown";
import type { Card } from "../services/queries.types";
import type { Id } from "./data.types";

export type InsertType = "card" | "symbol";

interface NotesEditorState {
  insertType: InsertType;
  insertCardFormat: CardFormat;
  insertPositionStart: number | undefined;
  insertPositionEnd: number | undefined;
}

interface NotesEditorFunctions {
  setInsertType: (insertType: InsertType) => void;
  setInsertPosition(start: number, end: number): void;
  resetInsertPosition: () => void;
  setCardFormatDefinition: (value: CardFormat) => void;
  insertCard(deckId: Id, card: Card): InsertResult;
  insertString(deckId: Id, string: string): InsertResult;
}

interface InsertResult {
  newCaretPosition: number | undefined;
}

export interface NotesEditorSlice {
  notesEditorState: NotesEditorState;
  notesEditorFunctions: NotesEditorFunctions;
}
