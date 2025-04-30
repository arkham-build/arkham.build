import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import {
  cardToMarkdown,
  insertCardFormatValueToCardFormatDefinition,
} from "../lib/cards-to-markdown";
import type { Id } from "./data.types";
import type { NotesEditorSlice } from "./notes-editor.types";

export const createNotesEditorSlice: StateCreator<
  StoreState,
  [],
  [],
  NotesEditorSlice
> = (set, get) => {
  function insertStringToDescription(deckId: Id, textToInsert: string) {
    const state = get();
    const { insertPositionStart, insertPositionEnd } = state.notesEditorState;
    const start = insertPositionStart;
    const end = insertPositionEnd;
    const currentEdits = state.deckEdits[deckId] ?? {};
    let currentText = currentEdits.description_md ?? "";
    if (start === undefined) {
      return { newCaretPosition: undefined };
    }
    if (end !== undefined && end > start) {
      currentText = currentText.slice(0, start) + currentText.slice(end);
    }
    currentText =
      currentText.slice(0, start) + textToInsert + currentText.slice(start);
    state.updateDescription(deckId, currentText);
    const newSelectionPosition = start + textToInsert.length;
    state.notesEditorFunctions.setInsertPosition(
      newSelectionPosition,
      newSelectionPosition,
    );
    return {
      newCaretPosition: newSelectionPosition,
    };
  }

  return {
    notesEditorState: {
      insertType: "card",
      insertCardFormat: "paragraph",
      insertPositionStart: undefined,
      insertPositionEnd: undefined,
    },
    notesEditorFunctions: {
      setInsertType(insertType) {
        const state = get();
        set({
          notesEditorState: {
            ...state.notesEditorState,
            insertType: insertType,
          },
        });
      },

      setInsertPosition(start, end) {
        const state = get();
        set({
          notesEditorState: {
            ...state.notesEditorState,
            insertPositionStart: start,
            insertPositionEnd: end,
          },
        });
      },

      setCardFormatDefinition(value) {
        const state = get();
        set({
          notesEditorState: {
            ...state.notesEditorState,
            insertCardFormat: value,
          },
        });
      },

      insertCard(deckId, card) {
        const state = get();
        const insertCardFormatValue = state.notesEditorState.insertCardFormat;
        const insertCardFormat = insertCardFormatValueToCardFormatDefinition(
          insertCardFormatValue,
        );
        const textToInsert = cardToMarkdown(
          card,
          state.lookupTables,
          state.metadata,
          insertCardFormat,
        );

        return insertStringToDescription(deckId, textToInsert);
      },

      insertString(deckId, string) {
        return insertStringToDescription(deckId, string);
      },

      resetInsertPosition() {
        const state = get();
        set({
          notesEditorState: {
            ...state.notesEditorState,
            insertPositionStart: undefined,
            insertPositionEnd: undefined,
          },
        });
      },
    },
  } satisfies NotesEditorSlice;
};
