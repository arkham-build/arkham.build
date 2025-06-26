import { useCallback } from "react";
import { CardSet } from "@/components/cardset";
import { useStore } from "@/store";
import {
  selectDeckCreateCardSets,
  selectDeckCreateInvestigators,
} from "@/store/selectors/deck-create";
import { useAccentColor } from "../../utils/use-accent-color";
import css from "./deck-create.module.css";

export function DeckCreateCardSets() {
  const onChangeCardQuantity = useStore(
    (state) => state.deckCreateChangeExtraCardQuantity,
  );

  const toggleConfigureCardSet = useStore(
    (state) => state.deckCreateToggleCardSet,
  );

  const cardSets = useStore(selectDeckCreateCardSets);

  const onCheckedChange = useCallback(
    (id: string) => {
      toggleConfigureCardSet(id);
    },
    [toggleConfigureCardSet],
  );

  const { investigator } = useStore(selectDeckCreateInvestigators);
  const cssVariables = useAccentColor(investigator.card.faction_code);

  return (
    <div className={css["card-selections"]} style={cssVariables}>
      {cardSets.map((set) =>
        set.cards.length ? (
          <CardSet
            key={set.id}
            onChangeCardQuantity={onChangeCardQuantity}
            onSelect={onCheckedChange}
            set={set}
          />
        ) : null,
      )}
    </div>
  );
}
