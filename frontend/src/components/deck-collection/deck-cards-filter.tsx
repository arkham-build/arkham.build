import type { Card } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { CardsCombobox } from "@/components/cards-combobox";
import { useStore } from "@/store";
import {
  filterDuplicates,
  filterMythosCards,
  filterType,
} from "@/store/lib/filtering";
import { makeSortFunction } from "@/store/lib/sorting";
import {
  selectCardsChanges,
  selectDeckFilterValue,
} from "@/store/selectors/deck-collection";
import {
  selectLocaleSortingCollator,
  selectMetadata,
} from "@/store/selectors/shared";
import { and, not } from "@/utils/fp";
import { FilterContainer } from "../filters/primitives/filter-container";

type Props = {
  containerClass?: string;
};

export function DeckCardsFilter({ containerClass }: Props) {
  const { t } = useTranslation();
  const changes = useStore(selectCardsChanges);
  const metadata = useStore(selectMetadata);
  const collator = useStore(selectLocaleSortingCollator);
  const open = useStore((state) => state.deckCollection.open.cards);
  const value = useStore((state) =>
    selectDeckFilterValue(state, "cards"),
  ) as string[];

  const locale = useStore((state) => state.settings.locale);

  const setFilterValue = useStore((state) => state.addDecksFilter);
  const setFilterOpen = useStore((state) => state.setDeckFilterOpen);
  const resetFilter = useStore((state) => state.resetDeckFilter);

  const playerCards = (() => {
    const playerCardFilter = and([
      filterMythosCards,
      not(filterType(["investigator"])),
      filterDuplicates,
    ]);

    const cards = Object.values(metadata.cards).filter(playerCardFilter);
    const sortFn = makeSortFunction(
      ["name", "level", "position"],
      metadata,
      collator,
    );
    return cards.sort(sortFn);
  })();

  const onReset = () => {
    resetFilter("cards");
  };

  const onOpenChange = (val: boolean) => {
    setFilterOpen("cards", val);
  };

  const onChange = (cards: Card[]) => {
    setFilterValue(
      "cards",
      cards.map((card) => card.code),
    );
  };

  return (
    <FilterContainer
      className={containerClass}
      changes={changes}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={open}
      title={t("deck.cards")}
      data-testid="deck-cards-filter"
    >
      <CardsCombobox
        autoFocus
        omitFloatingPortal
        id="cards-deck-filter"
        items={playerCards}
        label={t("deck.cards")}
        locale={locale}
        onValueChange={onChange}
        selectedItems={value
          .map((code) => metadata.cards[code])
          .filter(Boolean)}
      />
    </FilterContainer>
  );
}
