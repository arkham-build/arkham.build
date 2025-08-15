import { useTranslation } from "react-i18next";
import { CardsCombobox } from "@/components/cards-combobox";
import { Field } from "@/components/ui/field";
import { useStore } from "@/store";
import { type DecklistFilterProps, selectPlayerCards } from "./shared";

export function ExcludedCards({
  formState,
  setFormState,
}: DecklistFilterProps) {
  const { t } = useTranslation();
  const playerCards = useStore(selectPlayerCards);
  const locale = useStore((state) => state.settings.locale);

  return (
    <Field full>
      <CardsCombobox
        id="excluded-cards"
        items={playerCards}
        label={t("decklists.filters.excluded_cards")}
        locale={locale}
        onValueChange={(cards) => {
          setFormState((prev) => ({
            ...prev,
            excludedCards: cards,
          }));
        }}
        selectedItems={formState.excludedCards}
        showLabel
      />
    </Field>
  );
}
