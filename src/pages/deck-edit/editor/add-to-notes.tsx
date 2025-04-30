import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Card } from "@/store/services/queries.types";
import { PencilLine } from "lucide-react";
import { useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import { NotesTextareaRefContext } from "./notes-rte/notes-textarea-ref-context";

type Props = {
  card: Card;
  deck: ResolvedDeck;
};

export function AddToNotes(props: Props) {
  const { card, deck } = props;
  const { t } = useTranslation();
  const insertCardToDescription = useStore(
    (state) => state.notesEditorFunctions.insertCard,
  );
  const notesTextareaRef = useContext(NotesTextareaRefContext);
  const notesEditorState = useStore((state) => state.notesEditorState);
  const buttonDisabled = notesEditorState.insertPositionStart === undefined;
  const onButtonClick = useCallback(() => {
    const insertResult = insertCardToDescription(deck.id, card);
    if (notesTextareaRef.current !== null) {
      setTimeout(() => {
        notesTextareaRef.current?.setSelectionRange(
          insertResult.newCaretPosition ?? null,
          insertResult.newCaretPosition ?? null,
        );
      }, 0);
    }
  }, [card, deck.id, insertCardToDescription, notesTextareaRef]);

  return (
    <Button
      data-testid="editor-add-to-notes"
      iconOnly
      onClick={onButtonClick}
      tooltip={
        buttonDisabled
          ? t("deck_edit.actions.add_to_notes_disabled")
          : t("deck_edit.actions.add_to_notes")
      }
      disabled={buttonDisabled}
      size="sm"
      variant="bare"
    >
      <PencilLine />
    </Button>
  );
}
