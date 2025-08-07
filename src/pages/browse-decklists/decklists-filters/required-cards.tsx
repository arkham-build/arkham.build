import { useTranslation } from "react-i18next";
import { CardsCombobox } from "@/components/cards-combobox";
import { Field } from "@/components/ui/field";
import { useStore } from "@/store";
import { type DecklistFilterProps, selectPlayerCards } from "./shared";

export function RequiredCards({
  formState,
  setFormState,
}: DecklistFilterProps) {
  const { t } = useTranslation();
  const playerCards = useStore(selectPlayerCards);
  const locale = useStore((state) => state.settings.locale);

  return (
    <Field full>
      <CardsCombobox
        id="required-cards"
        items={playerCards}
        label={t("decklists.filters.required_cards")}
        locale={locale}
        onValueChange={(cards) => {
          setFormState((prev) => ({
            ...prev,
            requiredCards: cards,
          }));
        }}
        selectedItems={formState.requiredCards}
        showLabel
      />
    </Field>
  );
}
