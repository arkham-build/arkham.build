import { useTranslation } from "react-i18next";
import { FactionToggle } from "@/components/faction-toggle";
import { Field, FieldLabel } from "@/components/ui/field";
import { FACTION_ORDER } from "@/utils/constants";
import type { DecklistFilterProps } from "./shared";

const EMPTY_ARRAY: never[] = [];

export function InvestigatorFactions({
  disabled,
  formState,
  setFormState,
}: DecklistFilterProps) {
  const { t } = useTranslation();

  const factionOptions = FACTION_ORDER.filter(
    (faction) => faction !== "mythos" && faction !== "multiclass",
  ).map((faction) => ({
    code: faction,
    name: t(`common.faction.${faction}`),
  }));

  return (
    <Field full>
      <FieldLabel htmlFor="investigator-faction">
        {t("decklists.filters.investigator_factions")}
      </FieldLabel>
      <FactionToggle
        disabled={disabled}
        options={factionOptions}
        value={formState.investigator_factions ?? EMPTY_ARRAY}
        onValueChange={(investigator_factions) => {
          setFormState((prev) => ({
            ...prev,
            investigator_factions,
          }));
        }}
      />
    </Field>
  );
}
