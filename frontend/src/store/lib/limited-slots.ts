import type { Card, DeckOption } from "@arkham-build/shared";
import type { Interpreter } from "./buildql/interpreter";
import {
  getAdditionalDeckOptions,
  insertAdditionalDeckOptions,
  mapCardsToDeckOptions,
} from "./deck-options";
import type { ResolvedDeck } from "./types";

export type LimitedSlotOccupation = {
  entries: {
    card: Card;
    quantity: number;
  }[];
  index: number;
  option: DeckOption;
};

export function limitedSlotOccupation(
  deck: ResolvedDeck,
  buildQlInterpreter: Interpreter,
): undefined | LimitedSlotOccupation[] {
  const additionalDeckOptions = getAdditionalDeckOptions(deck);
  const deckOptions = insertAdditionalDeckOptions(
    deck.investigatorBack.card.deck_options ?? [],
    additionalDeckOptions,
  );

  const limitedSlotIndexes = deckOptions
    ?.map((option, index) => ({ option, index }))
    .filter(({ option }) => option.limit);

  if (!limitedSlotIndexes?.length) return undefined;

  const cards = Object.entries(deck.slots).flatMap(([code, quantity]) => {
    const card = deck.cards.slots[code]?.card;
    return card && quantity > 0 ? [card] : [];
  });
  const { cardsByOption } = mapCardsToDeckOptions(
    cards,
    deck.slots,
    deckOptions,
    buildQlInterpreter,
    {
      customizable: {
        properties: "actual",
        level: "actual",
      },
      selections: deck.selections,
      investigatorFront: deck.investigatorFront.card,
      additionalDeckOptions,
      targetDeck: "slots",
    },
  );

  return limitedSlotIndexes.map(({ index, option }) => {
    const matches = cardsByOption.get(index) ?? new Map<string, number>();
    const entries = Array.from(matches).flatMap(([code, quantity]) => {
      const card = deck.cards.slots[code]?.card;
      return card ? [{ card, quantity }] : [];
    });

    return { option, index, entries };
  });
}
