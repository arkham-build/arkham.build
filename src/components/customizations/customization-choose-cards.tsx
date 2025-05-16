import { useStore } from "@/store";
import { makeSortFunction } from "@/store/lib/sorting";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import type { CustomizationOption as CustomizationOptionType } from "@/store/services/queries.types";
import type { StoreState } from "@/store/slices";
import { displayAttribute } from "@/utils/card-utils";
import { time, timeEnd } from "@/utils/time";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { CardsCombobox } from "../cards-combobox";

const selectPlayerCardsForCustomizationOptions = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (_: StoreState, config: CustomizationOptionType["card"] | undefined) =>
    config,
  (metadata, lookupTables, collator, config) => {
    if (!config) return [];

    time("select_player_cards_for_customization_options");

    const options: Set<Card> = new Set();

    const traitTable = lookupTables.traits;
    const typeTable = lookupTables.typeCode;

    const traitTables = config.trait.map((trait) => traitTable[trait]);
    const typeTables = config.type.map((type) => typeTable[type]);

    const codes = [
      ...traitTables.flatMap(Object.keys),
      ...typeTables.flatMap(Object.keys),
    ];

    for (const code of codes) {
      if (
        !traitTables.some((x) => code in x) ||
        !typeTables.every((x) => code in x)
      ) {
        continue;
      }

      const card = metadata.cards[code];

      if (!card || card.duplicate_of_code) {
        continue;
      }

      options.add(card);
    }

    const sortFn = makeSortFunction(
      ["name", "level", "position"],
      metadata,
      collator,
    );

    const { cards } = Array.from(options)
      .sort(sortFn)
      .reduce(
        (acc, card) => {
          if (!acc.names.has(displayAttribute(card, "name"))) {
            acc.cards.push(card);
            acc.names.add(displayAttribute(card, "name"));
          }
          return acc;
        },
        {
          cards: [] as Card[],
          names: new Set<string>(),
        },
      );

    timeEnd("select_player_cards_for_customization_options");

    return cards;
  },
);

type Props = {
  selections: string[];
  config: CustomizationOptionType["card"];
  disabled?: boolean;
  id: string;
  limit: number;
  readonly?: boolean;
  onChange: (selections: string[]) => void;
};

export function CustomizationChooseCards(props: Props) {
  const { selections, config, disabled, id, limit, onChange, readonly } = props;
  const { t } = useTranslation();

  const cards = useStore((state) =>
    selectPlayerCardsForCustomizationOptions(state, config),
  );

  return (
    <CardsCombobox
      disabled={disabled}
      id={`${id}-choose-cards`}
      items={cards}
      label={t("common.card", { count: limit })}
      limit={limit}
      onValueChange={onChange}
      readonly={readonly}
      selectedItems={selections}
    />
  );
}
