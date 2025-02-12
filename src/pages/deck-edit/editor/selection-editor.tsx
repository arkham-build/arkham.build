import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { Selections } from "@/store/lib/types";
import { useTranslation } from "react-i18next";

type Props = {
  onSelectionChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  selections: Selections;
};

export function SelectionEditor(props: Props) {
  const { onSelectionChange, selections } = props;
  const { t } = useTranslation();

  return Object.entries(selections).map(([key, value]) => (
    <Field full key={key} padded>
      <FieldLabel>{t(`common.deck_options.${value.name}`)}</FieldLabel>
      {value.type === "deckSize" && (
        <Select
          data-testid={`create-select-${key}`}
          data-field={value.accessor}
          data-type={value.type}
          emptyLabel={t("common.none")}
          onChange={onSelectionChange}
          options={value.options.map((v) => ({
            value: v,
            label: v.toString(),
          }))}
          value={value.value ?? ""}
        />
      )}
      {value.type === "faction" && (
        <Select
          data-testid={`create-select-${key}`}
          data-field={value.accessor}
          data-type={value.type}
          emptyLabel={t("common.none")}
          onChange={onSelectionChange}
          options={value.options.map((v) => ({
            value: v,
            label: t(`common.factions.${v}`),
          }))}
          value={value.value ?? ""}
        />
      )}
      {value.type === "option" && (
        <Select
          data-field={value.accessor}
          data-testid={`create-select-${key}`}
          data-type={value.type}
          emptyLabel={t("common.none")}
          onChange={onSelectionChange}
          options={value.options.map((v) => ({
            value: v.id,
            label: t(`common.deck_options.${v.name}`),
          }))}
          value={value.value?.id ?? ""}
        />
      )}
    </Field>
  ));
}
