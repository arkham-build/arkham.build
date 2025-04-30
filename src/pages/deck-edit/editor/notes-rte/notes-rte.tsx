import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import type { StoreState } from "@/store/slices";
import { useCallback, useContext } from "react";
import { NotesRichTextEditorContext } from "./notes-rte-context";
import {
  NotesEditorToolbar,
  cardsComboboxId,
  symbolComboboxId,
} from "./notes-rte-toolbar";
import css from "./notes-rte.module.css";

export function NotesRichTextEditor({ deck }: { deck: ResolvedDeck }) {
  const notesTextareaRef = useContext(NotesRichTextEditorContext);

  const editingDeckDescription = useStore(
    (state: StoreState) =>
      state.deckEdits[deck.id]?.description_md ?? deck.description_md,
  );

  const updateDescription = useStore(
    (state: StoreState) => state.updateDescription,
  );

  const setInsertPosition = useStore(
    (state: StoreState) => state.notesEditorFunctions.setInsertPosition,
  );

  const setInsertPositionWithFocusEvent = useCallback(
    (evt: React.FocusEvent<HTMLTextAreaElement>) => {
      const selectionStart = evt.target.selectionStart;
      const selectionEnd = evt.target.selectionEnd;
      setInsertPosition(selectionStart, selectionEnd);
    },
    [setInsertPosition],
  );

  const insertType = useStore(
    (state: StoreState) => state.notesEditorState.insertType,
  );
  const setInsertType = useStore(
    (state: StoreState) => state.notesEditorFunctions.setInsertType,
  );

  const onDescriptionChange = useCallback(
    (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (evt.target instanceof HTMLTextAreaElement) {
        updateDescription(deck.id, evt.target.value);
      }
    },
    [updateDescription, deck.id],
  );

  return (
    <>
      <NotesEditorToolbar deck={deck} deckId={deck.id} />
      <textarea
        className={css["notes-rte"]}
        data-testid="editor-description"
        ref={notesTextareaRef}
        value={editingDeckDescription ?? ""}
        onFocus={setInsertPositionWithFocusEvent}
        onChange={onDescriptionChange}
        onKeyDownCapture={(evt) => {
          // TODO: Should focus combobox with ref instead of using ID?
          if (evt.ctrlKey && evt.shiftKey && evt.key === " ") {
            evt.preventDefault();
            if (insertType !== "symbol") {
              setInsertType("symbol");
              setTimeout(() => {
                document.getElementById(symbolComboboxId)?.focus();
              }, 0);
            } else {
              document.getElementById(symbolComboboxId)?.focus();
            }
          } else if (evt.ctrlKey && evt.key === " ") {
            evt.preventDefault();
            if (insertType !== "card") {
              setInsertType("card");
              setTimeout(() => {
                document.getElementById(cardsComboboxId)?.focus();
              }, 0);
            } else {
              document.getElementById(cardsComboboxId)?.focus();
            }
          }
        }}
        onBlur={(evt) => {
          onDescriptionChange(evt);
          setInsertPositionWithFocusEvent(evt);
        }}
      />
    </>
  );
}
