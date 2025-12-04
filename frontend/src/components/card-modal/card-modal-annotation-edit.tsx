import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { useStore } from "@/store";
import type { Id } from "@/store/schemas/deck.schema";
import type { StoreState } from "@/store/slices";
import { cx } from "@/utils/cx";
import { debounce } from "@/utils/debounce";
import { useHotkey } from "@/utils/use-hotkey";
import { AnnotationContainer } from "../annotations/annotation";
import { AutoSizingTextarea } from "../ui/auto-sizing-textarea";
import { Button } from "../ui/button";
import css from "./card-modal.module.css";

type Props = {
  cardCode: string;
  deckId: Id;
  text: string | null | undefined;
};

const selectUpdateAnnotation = createSelector(
  (state: StoreState) => state.updateAnnotation,
  (updateAnnotation) => debounce(updateAnnotation, 100),
);

export function AnnotationEdit(props: Props) {
  const { cardCode, deckId, text } = props;
  const { t } = useTranslation();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [liveValue, setValue] = useState(text ?? "");

  const updateAnnotation = useStore(selectUpdateAnnotation);

  const onAnnotationChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(event.target.value);
      updateAnnotation(deckId, cardCode, event.target.value);
    },
    [updateAnnotation, cardCode, deckId],
  );

  const onAnnotationClear = useCallback(() => {
    setValue("");
    updateAnnotation(deckId, cardCode, null);
  }, [updateAnnotation, cardCode, deckId]);

  const focusTextarea = useCallback(() => {
    const element = textareaRef.current;
    if (element) {
      element.focus();
      element.setSelectionRange(element.value.length, element.value.length);
    }
  }, []);

  useHotkey("a", focusTextarea, {
    allowInputFocused: false,
  });

  return (
    <AnnotationContainer
      className={cx(css["annotation-edit"], !!liveValue && css["active"])}
      actions={
        <Button
          size="sm"
          onClick={onAnnotationClear}
          variant="bare"
          style={{ visibility: liveValue ? "visible" : "hidden" }}
        >
          {t("common.clear")}
        </Button>
      }
    >
      <AutoSizingTextarea
        data-testid="annotation-edit"
        value={liveValue}
        ref={textareaRef}
        onChange={onAnnotationChange}
      />
    </AnnotationContainer>
  );
}
