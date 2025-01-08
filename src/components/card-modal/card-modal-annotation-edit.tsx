import { useStore } from "@/store";
import type { StoreState } from "@/store/slices";
import type { Id } from "@/store/slices/data.types";
import { debounce } from "@/utils/debounce";
import { useCallback, useState } from "react";
import { createSelector } from "reselect";
import { AnnotationContainer } from "../annotations/annotation";
import { Button } from "../ui/button";

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

  return (
    <AnnotationContainer
      actions={
        <Button size="sm" onClick={onAnnotationClear} variant="bare">
          Clear
        </Button>
      }
    >
      <textarea
        data-testid="annotation-edit"
        value={liveValue}
        onChange={onAnnotationChange}
      />
    </AnnotationContainer>
  );
}
