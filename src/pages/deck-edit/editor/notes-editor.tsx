import { AutoSizingTextarea } from "@/components/ui/auto-sizing-textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { Scroller } from "@/components/ui/scroller";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import type { StoreState } from "@/store/slices";
import { debounce } from "@/utils/debounce";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import css from "./notes-editor.module.css";
import { NotesRichTextEditor } from "./notes-rte/notes-rte";

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
