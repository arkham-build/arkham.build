import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import type { DecklistFilterProps } from "./shared";

export function AnalyzeSideDecks({
  formState,
  setFormState,
}: DecklistFilterProps) {
  const { t } = useTranslation();

  return (
    <Field full>
      <Checkbox
        checked={formState.analyzeSideDecks}
        id="analyze-side-decks"
        label={t("deck_edit.recommendations.analyze_side_decks")}
        onCheckedChange={(checked) => {
          setFormState((prev) => ({
            ...prev,
            analyzeSideDecks: checked === true,
          }));
        }}
      />
    </Field>
  );
}
