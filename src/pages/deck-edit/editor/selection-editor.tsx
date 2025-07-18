import { useTranslation } from "react-i18next";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { Selections } from "@/store/lib/types";
import { formatDeckOptionString } from "@/utils/formatting";

type Props = {
  onChangeSelection: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  selections: Selections;
};

export function SelectionEditor(props: Props) {
  const { onChangeSelection, selections } = props;
  const { t } = useTranslation();

  return Object.entries(selections).map(([key, value]) => (
    <Field full key={key} padded>
      <FieldLabel>{formatDeckOptionString(value.name)}</FieldLabel>
      {value.type === "deckSize" && (
        <Select
          data-testid={`create-select-${key}`}
          data-field={value.accessor}
          data-type={value.type}
          emptyLabel={t("common.none")}
          onChange={onChangeSelection}
          options={value.options.map((v) => ({
            value: v,
            label: v.toString(),
          }))}
          required
          value={value.value}
        />
      )}
      {value.type === "faction" && (
        <Select
          data-testid={`create-select-${key}`}
          data-field={value.accessor}
          data-type={value.type}
          emptyLabel={t("common.none")}
          onChange={onChangeSelection}
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
          onChange={onChangeSelection}
          options={value.options.map((v) => ({
            value: v.id,
            label: formatDeckOptionString(v.name),
          }))}
          value={value.value?.id ?? ""}
        />
      )}
    </Field>
  ));
}
