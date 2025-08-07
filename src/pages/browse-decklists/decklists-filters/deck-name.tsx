import { useTranslation } from "react-i18next";
import { Field, FieldLabel } from "@/components/ui/field";
import type { DecklistFilterProps } from "./shared";

export function DeckName({ formState, setFormState }: DecklistFilterProps) {
  const { t } = useTranslation();

  return (
    <Field full>
      <FieldLabel htmlFor="deck-name">{t("decklists.filters.name")}</FieldLabel>
      <input
        id="deck-name"
        onChange={(evt) => {
          const name = evt.target.value;
          setFormState((prev) => ({ ...prev, name }));
        }}
        placeholder={t("decklists.filters.name_placeholder")}
        type="text"
        value={formState.name || ""}
      />
    </Field>
  );
}
