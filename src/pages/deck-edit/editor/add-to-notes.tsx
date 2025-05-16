import { Button } from "@/components/ui/button";
import {
  cardFormatDefinition,
  cardToMarkdown,
} from "@/pages/deck-edit/editor/notes-rte/cards-to-markdown";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectLookupTables, selectMetadata } from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import { PencilLine } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNotesRichTextEditorContext } from "./notes-rte/notes-rte-context";

type Props = {
  card: Card;
  deck: ResolvedDeck;
};

export function AddToNotes(props: Props) {
  const { card } = props;
  const { t } = useTranslation();

  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);

  const { cardFormat, insertTextAtCaret } = useNotesRichTextEditorContext();

  const onClick = useCallback(() => {
    insertTextAtCaret(
      cardToMarkdown(
        card,
        metadata,
        lookupTables,
        cardFormatDefinition(cardFormat),
      ),
    );
  }, [card, insertTextAtCaret, metadata, lookupTables, cardFormat]);

  return (
    <Button
      data-testid="editor-add-to-notes"
      iconOnly
      tooltip={t("deck_edit.actions.add_to_notes")}
      size="sm"
      variant="bare"
      onClick={onClick}
    >
      <PencilLine />
    </Button>
  );
}
