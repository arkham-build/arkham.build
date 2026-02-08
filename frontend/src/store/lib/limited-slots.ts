import type { Card, DeckOption } from "@arkham-build/shared";
import { getAdditionalDeckOptions } from "./deck-validation";
import { makeOptionFilter } from "./filtering";
import type { ResolvedDeck } from "./types";

type Mapping = {
  [key: number]: Record<string, number>;
};

function mapCardsToDeckOptions(deck: ResolvedDeck, deckOptions: DeckOption[]) {
  // number of options with a limit clause.
  // in contrast to the deck validation logic,
  // we append unmatched cards to the last option.
  const limitOptionCount = deckOptions.filter((option) => option.limit).length;

  // current index of `limit` options.
  let limitOptionIndex = 0;

  // matches options to cards. one card may be part of two options
  // if not all copies can be matched to a single option.
  const optionsMatched: Mapping = {};

  // tracks the number of copies of a card that could be matched ot an option.
  const cardsMatched: Record<string, number> = {};

  for (let i = 0; i < deckOptions.length; i++) {
    const option = deckOptions[i];

    // skip options that did not affect limit counts.
    if ((option.atleast && option.virtual) || option.not) continue;

    if (option.limit) {
      limitOptionIndex += 1;
    }

    const filter = makeOptionFilter(option, {
      customizable: {
        properties: "actual",
        level: "actual",
      },
      selections: deck.selections,
      targetDeck: "slots",
    });

    if (filter) {
      let matchCount = 0;

      for (const [code, quantity] of Object.entries(deck.slots)) {
        const card = deck.cards.slots[code];
        if (!card) continue;

        if (quantity > 0 && filter(card.card)) {
          for (let j = 0; j < quantity; j += 1) {
            // all copies of the card have been matched to an option already.
            if (cardsMatched[card.card.code] === quantity) {
              break;
            }

            // move to next option if no more copies of a card
            // can be matched to a limit option, and the limit
            // option is not the last option.
            if (
              option.limit &&
              limitOptionIndex < limitOptionCount &&
              matchCount >= option.limit
            ) {
              break;
            }

            optionsMatched[i] ??= {};
            optionsMatched[i][card.card.code] =
              (optionsMatched[i][card.card.code] ?? 0) + 1;
            cardsMatched[card.card.code] =
              (cardsMatched[card.card.code] ?? 0) + 1;

            matchCount += 1;
          }
        }
      }
    }
  }

  return optionsMatched;
}

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
): undefined | LimitedSlotOccupation[] {
  const deckOptions = [
    ...(deck.investigatorBack.card.deck_options ?? []),
    ...getAdditionalDeckOptions(deck),
  ];

  const limitedSlotIndexes = deckOptions
    ?.map((option, index) => ({ option, index }))
    .filter(({ option }) => option.limit);

  if (!limitedSlotIndexes?.length) return undefined;

  const mapping = mapCardsToDeckOptions(deck, deckOptions);

  return limitedSlotIndexes.map(({ index, option }) => {
    const matches = mapping?.[index] ?? {};

    return {
      option,
      index,
      entries: Object.entries(matches).map(([code, quantity]) => ({
        card: deck.cards.slots[code].card,
        quantity,
      })),
    };
  });
}
