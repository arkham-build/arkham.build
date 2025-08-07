import { useTranslation } from "react-i18next";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  RadioButtonGroup,
  RadioButtonGroupItem,
} from "@/components/ui/radio-button-group";
import type { DecklistFilterProps } from "./shared";

export function DescriptionLength({
  formState,
  setFormState,
}: DecklistFilterProps) {
  const { t } = useTranslation();

  const handleValueChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      description_length: Number(value),
    }));
  };

  return (
    <Field full>
      <FieldLabel htmlFor="description-length">
        {t("decklists.filters.description_length")}
      </FieldLabel>
      <div>
        <RadioButtonGroup
          value={
            formState.description_length === undefined
              ? ""
              : String(formState.description_length)
          }
          onValueChange={handleValueChange}
        >
          <RadioButtonGroupItem value="0" size="small">
            {t("decklists.filters.description_length_short")}
          </RadioButtonGroupItem>
          <RadioButtonGroupItem value="100" size="small">
            {t("decklists.filters.description_length_medium")}
          </RadioButtonGroupItem>
          <RadioButtonGroupItem value="500" size="small">
            {t("decklists.filters.description_length_long")}
          </RadioButtonGroupItem>
        </RadioButtonGroup>
      </div>
    </Field>
  );
}
