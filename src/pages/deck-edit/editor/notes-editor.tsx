import { AutoSizingTextarea } from "@/components/ui/auto-sizing-textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { Scroller } from "@/components/ui/scroller";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import type { StoreState } from "@/store/slices";
import { debounce } from "@/utils/debounce";
import { useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import css from "./notes-editor.module.css";
import {
  NotesEditorToolbar,
  cardsComboboxId,
  symbolComboboxId,
} from "./notes-rte/notes-editor-toolbar";
import { NotesTextareaRefContext } from "./notes-rte/notes-textarea-ref-context";

type Props = {
  deck: ResolvedDeck;
};

const selectUpdateMetaProperty = createSelector(
  (state: StoreState) => state.updateMetaProperty,
  (updateMetaProperty) => debounce(updateMetaProperty, 100),
);

export function NotesEditor(props: Props) {
  const { deck } = props;

  const { t } = useTranslation();

  const updateMetaProperty = useStore(selectUpdateMetaProperty);

  const onBannerUrlChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      if (evt.target instanceof HTMLInputElement) {
        updateMetaProperty(deck.id, "banner_url", evt.target.value);
      }
    },
    [updateMetaProperty, deck.id],
  );

  const onIntroChange = useCallback(
    (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (evt.target instanceof HTMLTextAreaElement) {
        updateMetaProperty(deck.id, "intro_md", evt.target.value);
      }
    },
    [updateMetaProperty, deck.id],
  );

  return (
    <Scroller>
      <div className={css["notes-editor"]}>
        <Field full helpText={t("deck_edit.notes.description_help")} padded>
          <FieldLabel>{t("deck_edit.notes.description")}</FieldLabel>
          <NotesRichTextEditor deck={deck} />
        </Field>
        <Field full padded helpText={t("deck_edit.notes.banner_url_help")}>
          <FieldLabel>{t("deck_edit.notes.banner_url")}</FieldLabel>
          <input
            defaultValue={deck.metaParsed.banner_url ?? ""}
            onChange={onBannerUrlChange}
            type="text"
            placeholder={t("deck_edit.notes.banner_url_placeholder")}
          />
        </Field>
        <Field full padded helpText={t("deck_edit.notes.intro_help")}>
          <FieldLabel>{t("deck_edit.notes.intro")}</FieldLabel>
          <AutoSizingTextarea
            data-testid="editor-intro"
            defaultValue={deck.metaParsed.intro_md ?? ""}
            onChange={onIntroChange}
          />
        </Field>
      </div>
    </Scroller>
  );
}

function NotesRichTextEditor({ deck }: { deck: ResolvedDeck }) {
  const notesTextareaRef = useContext(NotesTextareaRefContext);

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
        className={css["notes-editor-textarea"]}
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
