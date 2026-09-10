import type { Card, DeckOption } from "@arkham-build/shared";
import { range } from "@/utils/range";
import type { Interpreter } from "./buildql/interpreter";
import { type InvestigatorAccessConfig, makeOptionFilter } from "./filtering";
import type { ResolvedDeck } from "./types";

const UNTARGETED_KEYS = new Set(["name", "error", "id", "level", "limit"]);

type CardQuantities = Readonly<Record<string, number>>;
type OptionCardQuantities = Map<number, Map<string, number>>;

type DeckOptionAllocation = {
  cardsByOption: OptionCardQuantities;
  overflowByOption: OptionCardQuantities;
};

export function getAdditionalDeckOptions(deck: ResolvedDeck) {
  return Object.values(deck.cards.slots).reduce((acc, { card }) => {
    if (card.type_code !== "investigator" && card.deck_options) {
      const quantity = deck.slots[card.code] ?? 0;

      for (const _ of range(0, quantity)) {
        acc.push(...card.deck_options);
      }
    }

    return acc;
  }, [] as DeckOption[]);
}

export function insertAdditionalDeckOptions(
  baseDeckOptions: DeckOption[],
  additionalDeckOptions: DeckOption[],
) {
  const deckOptions = [...baseDeckOptions];
  const unlimitedOptionIndex = deckOptions.findLastIndex(
    (option) => !option.limit,
  );

  for (const option of additionalDeckOptions) {
    if (unlimitedOptionIndex !== -1 && !hasOnlyUntargetedKeys(option)) {
      deckOptions.splice(unlimitedOptionIndex + 1, 0, option);
    } else {
      deckOptions.push(option);
    }
  }

  return deckOptions;
}

export function mapCardsToDeckOptions(
  cards: Card[],
  quantities: CardQuantities,
  deckOptions: DeckOption[],
  buildQlInterpreter: Interpreter,
  config: InvestigatorAccessConfig,
): DeckOptionAllocation {
  const cardsByOption: OptionCardQuantities = new Map();
  const overflowByOption: OptionCardQuantities = new Map();
  const matchedByCard = new Map<string, number>();
  const optionFilters = deckOptions.map((option) =>
    option.virtual
      ? undefined
      : makeOptionFilter(option, buildQlInterpreter, config),
  );

  // Once a card matches a `not` option, later options cannot match it.
  const exclusions = new Map<string, number>();

  for (
    let optionIndex = 0;
    optionIndex < deckOptions.length;
    optionIndex += 1
  ) {
    const option = deckOptions[optionIndex];
    if (option.virtual) continue;

    const filter = optionFilters[optionIndex];
    if (!filter) continue;

    let optionMatchCount = 0;
    const limit = option.not ? undefined : option.limit;

    // TODO: This is a greedy heuristic, not maximum matching. Cards with the
    // same number of later options can still require different assignments. For
    // example: X matches A/C, Y matches A/B, and Z matches only B.
    // Right now, no such case exists in official cards, so it can stay simple.
    // A `maximum bipartite matching` algorithm could solve the general case.
    const countMatchingOptions = (card: Card) =>
      countLaterLimitedOptions(card, optionIndex, deckOptions, optionFilters);

    const orderedCards =
      limit != null
        ? cards.toSorted(
            (left, right) =>
              countMatchingOptions(left) - countMatchingOptions(right),
          )
        : cards;

    for (const card of orderedCards) {
      if (exclusions.has(card.code)) continue;

      const quantity = quantities[card.code] ?? 0;
      const matchedQuantity = matchedByCard.get(card.code) ?? 0;
      if (quantity <= matchedQuantity || !filter(card)) continue;

      if (option.not) {
        exclusions.set(card.code, optionIndex);
        continue;
      }

      const availableQuantity = quantity - matchedQuantity;
      const availableOptionSlots =
        limit == null ? availableQuantity : limit - optionMatchCount;
      const matchCount = Math.min(availableQuantity, availableOptionSlots);

      if (matchCount > 0) {
        addCardQuantity(cardsByOption, optionIndex, card.code, matchCount);
        matchedByCard.set(card.code, matchedQuantity + matchCount);
        optionMatchCount += matchCount;
      }

      if (limit != null && optionMatchCount >= limit) break;
    }
  }

  // Attribute each unmatched copy to the last limited option that could
  // actually include it. These copies are what make that option overflow.
  for (const card of cards) {
    const quantity = quantities[card.code] ?? 0;
    const unmatchedCount = quantity - (matchedByCard.get(card.code) ?? 0);
    if (unmatchedCount <= 0) continue;

    const exclusionIndex = exclusions.get(card.code);
    const optionIndex = findIndexReversed(deckOptions, (option, index) => {
      if (
        option.limit == null ||
        option.not ||
        option.virtual ||
        option.atleast ||
        (exclusionIndex != null && index >= exclusionIndex)
      ) {
        return false;
      }

      return optionFilters[index]?.(card) ?? false;
    });
    if (optionIndex === -1) continue;

    addCardQuantity(cardsByOption, optionIndex, card.code, unmatchedCount);
    addCardQuantity(overflowByOption, optionIndex, card.code, unmatchedCount);
  }

  return { cardsByOption, overflowByOption };
}

function countLaterLimitedOptions(
  card: Card,
  currentOptionIndex: number,
  deckOptions: DeckOption[],
  optionFilters: ReturnType<typeof makeOptionFilter>[],
) {
  let count = 0;

  for (
    let optionIndex = currentOptionIndex + 1;
    optionIndex < deckOptions.length;
    optionIndex += 1
  ) {
    const option = deckOptions[optionIndex];
    const filter = optionFilters[optionIndex];
    if (!filter || !filter(card)) continue;
    if (option.not) break;

    if (option.limit != null && !option.virtual && !option.atleast) {
      count += 1;
    }
  }

  return count;
}

function addCardQuantity(
  mapping: OptionCardQuantities,
  optionIndex: number,
  code: string,
  quantity: number,
) {
  let optionMapping = mapping.get(optionIndex);

  if (!optionMapping) {
    optionMapping = new Map();
    mapping.set(optionIndex, optionMapping);
  }

  optionMapping.set(code, (optionMapping.get(code) ?? 0) + quantity);
}

function findIndexReversed<T>(
  array: T[],
  predicate: (item: T, index: number) => boolean,
): number {
  for (let i = array.length - 1; i >= 0; i -= 1) {
    if (predicate(array[i], i)) return i;
  }

  return -1;
}

function hasOnlyUntargetedKeys(option: DeckOption) {
  return Object.keys(option).every((key) => UNTARGETED_KEYS.has(key));
}
