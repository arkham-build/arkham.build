import { useTranslation } from "react-i18next";
import { FactionToggle } from "@/components/faction-toggle";
import { Field, FieldLabel } from "@/components/ui/field";
import { FACTION_ORDER } from "@/utils/constants";
import type { DecklistFilterProps } from "./shared";

export function InvestigatorFactions({
  disabled,
  formState,
  setFormState,
}: DecklistFilterProps) {
  const { t } = useTranslation();

  const factionOptions = FACTION_ORDER.filter(
    (faction) => faction !== "mythos",
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
        value={formState.investigatorFactions}
        onValueChange={(value) => {
          setFormState((prev) => ({
            ...prev,
            investigatorFactions: value,
          }));
        }}
      />
    </Field>
  );
}
