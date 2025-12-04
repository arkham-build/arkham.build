import { useTranslation } from "react-i18next";
import { Field, FieldLabel } from "@/components/ui/field";
import { SearchInput } from "@/components/ui/search-input";
import type { DecklistFilterProps } from "./shared";

export function Author({ formState, setFormState }: DecklistFilterProps) {
  const { t } = useTranslation();

  return (
    <Field full>
      <FieldLabel htmlFor="author">{t("decklists.filters.author")}</FieldLabel>
      <SearchInput
        id="author"
        omitSearchIcon
        onChangeValue={(authorName) => {
          setFormState((prev) => ({ ...prev, authorName }));
        }}
        label={t("decklists.filters.author")}
        placeholder={t("decklists.filters.author_placeholder")}
        type="text"
        value={formState.authorName}
      />
    </Field>
  );
}
