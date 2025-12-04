import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CardsCombobox } from "@/components/cards-combobox";
import { Field } from "@/components/ui/field";
import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import {
  type DecklistFilterProps,
  selectPlayerCardsFilter,
  selectPlayerCardsSort,
} from "./shared";

export function RequiredCards({
  formState,
  setFormState,
}: DecklistFilterProps) {
  const { t } = useTranslation();

  const metadata = useStore(selectMetadata);
  const playerCardsFilter = useStore(selectPlayerCardsFilter);
  const sortFn = useStore(selectPlayerCardsSort);

  const locale = useStore((state) => state.settings.locale);

  const playerCards = useMemo(() => {
    const playerCards = Object.values(metadata.cards).filter(playerCardsFilter);
    return playerCards.sort(sortFn);
  }, [metadata, playerCardsFilter, sortFn]);

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
            requiredCards: cards.map((card) => card.code),
          }));
        }}
        selectedItems={formState.requiredCards
          .map((code) => metadata.cards[code])
          .filter(Boolean)}
        showLabel
      />
    </Field>
  );
}
