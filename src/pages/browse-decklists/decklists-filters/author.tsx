import { useTranslation } from "react-i18next";
import { Field, FieldLabel } from "@/components/ui/field";
import type { DecklistFilterProps } from "./shared";

export function Author({ formState, setFormState }: DecklistFilterProps) {
  const { t } = useTranslation();

  return (
    <Field full>
      <FieldLabel htmlFor="author">{t("decklists.filters.author")}</FieldLabel>
      <input
        id="author"
        onChange={(evt) => {
          const authorName = evt.target.value;
          setFormState((prev) => ({ ...prev, authorName }));
        }}
        placeholder={t("decklists.filters.author_placeholder")}
        type="text"
        value={formState.authorName}
      />
    </Field>
  );
}
