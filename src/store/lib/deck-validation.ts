import {
  cardLevel,
  cardLimit,
  displayAttribute,
  isRandomBasicWeaknessLike,
  isStaticInvestigator,
} from "@/utils/card-utils";
import { DECK_SIZE_ADJUSTMENTS, SPECIAL_CARD_CODES } from "@/utils/constants";
import { range } from "@/utils/range";
import { time, timeEnd } from "@/utils/time";
import type {
  Card,
  DeckOption,
  DeckRequirements,
} from "../services/queries.types";
import type { Metadata } from "../slices/metadata.types";
import type { InvestigatorAccessConfig } from "./filtering";
import {
  filterInvestigatorAccess,
  filterInvestigatorWeaknessAccess,
  makeOptionFilter,
} from "./filtering";
import type { LookupTables } from "./lookup-tables.types";
import type { ResolvedDeck } from "./types";

export type DeckValidationResult = {
  valid: boolean;
  errors: Error[];
};

type ValidationError =
  | "DECK_REQUIREMENTS_NOT_MET"
  | "FORBIDDEN"
  | "INVALID_CARD_COUNT"
  | "INVALID_DECK_OPTION"
  | "INVALID_INVESTIGATOR"
  | "TOO_FEW_CARDS"
  | "TOO_MANY_CARDS";

type BaseError = {
  type: ValidationError;
};

type TooManyCardsError = {
  type: "TOO_MANY_CARDS";
  details: {
    target: "slots" | "extraSlots";
    count: number;
    countRequired: number;
  };
};

type TooFewCardsError = {
  type: "TOO_FEW_CARDS";
  details: {
    target: "slots" | "extraSlots";
    count: number;
    countRequired: number;
  };
};

type DeckOptionsError = {
  type: "INVALID_DECK_OPTION";
  details: {
    count: string;
    error: string;
  };
};

type DeckLimitViolation = {
  code: string;
  limit: number;
  quantity: number;
};

type InvalidCardError = {
  type: "INVALID_CARD_COUNT";
  details: DeckLimitViolation[];
};

type DeckRequirementsNotMetError = {
  type: "DECK_REQUIREMENTS_NOT_MET";
  details: {
    code: string;
    quantity: number;
    required: number;
  }[];
};

export type ForbiddenCardError = {
  type: "FORBIDDEN";
  details: {
    code: string;
    target: "slots" | "extraSlots";
  }[];
};

export function isTooManyCardsError(error: Error): error is TooManyCardsError {
  return error.type === "TOO_MANY_CARDS";
}

export function isDeckOptionsError(error: Error): error is DeckOptionsError {
  return error.type === "INVALID_DECK_OPTION";
}

export function isInvalidCardCountError(
  error: Error,
): error is InvalidCardError {
  return error.type === "INVALID_CARD_COUNT";
}

export function isForbiddenCardError(
  error: Error,
): error is ForbiddenCardError {
  return error.type === "FORBIDDEN";
}

export function isTooFewCardsError(error: Error): error is TooFewCardsError {
  return error.type === "TOO_FEW_CARDS";
}

export function isDeckRequirementsNotMetError(
  error: Error,
): error is DeckRequirementsNotMetError {
  return error.type === "DECK_REQUIREMENTS_NOT_MET";
}

export function isInvalidInvestigatorError(
  error: Error,
): error is BaseError & { type: "INVALID_INVESTIGATOR" } {
  return error.type === "INVALID_INVESTIGATOR";
}

type Error =
  | BaseError
  | InvalidCardError
  | ForbiddenCardError
  | DeckOptionsError
  | TooManyCardsError
  | TooFewCardsError
  | DeckRequirementsNotMetError;

function findIndexReversed<T>(
  array: T[],
  predicate: (item: T) => boolean,
): number {
  for (let i = array.length - 1; i >= 0; i -= 1) {
    if (predicate(array[i])) return i;
  }

  return -1;
}

function formatReturnValue(errors: Error[]) {
  return { valid: errors.length === 0, errors };
}

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

export function validateDeck(
  deck: ResolvedDeck,
  metadata: Metadata,
  lookupTables: LookupTables,
): DeckValidationResult {
  time("validate_deck");

  if (isStaticInvestigator(deck.investigatorBack.card)) {
    return {
      valid: true,
      errors: [],
    };
  }

  if (!validateInvestigator(deck)) {
    return {
      valid: false,
      errors: [{ type: "INVALID_INVESTIGATOR" }],
    };
  }

  const errors: Error[] = [
    ...validateDeckSize(deck),
    ...validateSlots(deck, metadata, lookupTables),
  ];

  if (deck.hasExtraDeck) {
    errors.push(...validateExtraDeckSize(deck));
    errors.push(...validateSlots(deck, metadata, lookupTables, "extraSlots"));
  }

  timeEnd("validate_deck");
  return formatReturnValue(errors);
}

function validateInvestigator(deck: ResolvedDeck) {
  const investigatorBack = deck.investigatorBack.card;

  if (
    investigatorBack.type_code !== "investigator" ||
    !investigatorBack.deck_options ||
    !investigatorBack.deck_requirements
  )
    return false;

  let valid = true;

  for (const option of investigatorBack.deck_options) {
    if (option.deck_size_select) {
      valid = !!deck.metaParsed.deck_size_selected;
    } else if (option.faction_select) {
      valid =
        !!deck.metaParsed.faction_selected ||
        (!!deck.metaParsed.faction_1 && !!deck.metaParsed.faction_2);
    } else if (option.option_select) {
      valid = !!deck.metaParsed.option_selected;
    }

    if (!valid) break;
  }

  return valid;
}

function validateDeckSize(deck: ResolvedDeck): Error[] {
  const investigatorBack = deck.investigatorBack.card;

  let investigatorDeckSize = investigatorBack.deck_requirements?.size ?? 0;

  // special case: deck size selection.
  const hasDeckSizeOption = investigatorBack.deck_options?.some(
    (o) => !!o.deck_size_select,
  );
  if (hasDeckSizeOption) {
    investigatorDeckSize = Number.parseInt(
      deck.metaParsed.deck_size_selected as string,
      10,
    );
  }

  // special case: option selection.
  const optionSelect = investigatorBack.deck_options?.find(
    (o) => !!o.option_select,
  );
  const selectedOption = optionSelect?.option_select?.find(
    (o) => o.id === deck.metaParsed.option_selected,
  );
  if (selectedOption?.size) investigatorDeckSize += selectedOption.size;

  const adjustment = Object.entries(DECK_SIZE_ADJUSTMENTS).reduce<number>(
    (acc, [code, adjustment]) => {
      return deck.slots[code] ? acc + adjustment * deck.slots[code] : acc;
    },
    0,
  );

  const deckSize = deck.stats.deckSize;
  const targetDeckSize = investigatorDeckSize + adjustment;

  const details = {
    target: "slots" as const,
    count: deckSize,
    countRequired: targetDeckSize,
  };

  return deckSize !== targetDeckSize
    ? deckSize > targetDeckSize
      ? [
          {
            type: "TOO_MANY_CARDS",
            details,
          },
        ]
      : [{ type: "TOO_FEW_CARDS", details }]
    : [];
}

function validateExtraDeckSize(deck: ResolvedDeck): Error[] {
  const investigatorBack = deck.investigatorBack.card;

  // FIXME: this is a hack. Instead, we should not count signatures towards side deck size.
  const targetDeckSize =
    (investigatorBack.side_deck_requirements?.size ?? 0) + 1;

  const deckSize = Object.values(deck.extraSlots ?? {}).reduce(
    (acc, curr) => acc + curr,
    0,
  );

  const details = {
    target: "extraSlots" as const,
    count: deckSize,
    countRequired: targetDeckSize,
  };

  return deckSize !== targetDeckSize
    ? deckSize > targetDeckSize
      ? [
          {
            type: "TOO_MANY_CARDS",
            details,
          },
        ]
      : [
          {
            type: "TOO_FEW_CARDS",
            details,
          },
        ]
    : [];
}

function validateSlots(
  deck: ResolvedDeck,
  metadata: Metadata,
  lookupTables: LookupTables,
  mode: "slots" | "extraSlots" = "slots",
): Error[] {
  const validators: SlotValidator[] = [
    new DeckLimitsValidator(deck),
    new DeckRequiredCardsValidator(deck, mode),
    new DeckOptionsValidator(deck, lookupTables, mode),
  ];

  if (mode === "extraSlots") {
    validators.push(new SideDeckLimitsValidator());
  }

  const accessor =
    mode === "slots" ? ("slots" as const) : ("extraSlots" as const);

  for (const [code, quantity] of Object.entries(deck[accessor] ?? {})) {
    const slotEntry = deck.cards[accessor][code];

    if (!slotEntry) {
      continue;
    }

    const card = slotEntry.card;

    const isStoryAsset = card.encounter_code && card.faction_code === "neutral";
    if (isStoryAsset || quantity === 0) {
      continue;
    }

    // normalize duplicates to base version before checking access.
    // right now, this is mostly still required for promo marie.
    const normalized = card.duplicate_of_code
      ? metadata.cards[card.duplicate_of_code]
      : card;

    for (const validator of validators) {
      validator.add(normalized, quantity);
    }
  }

  return validators.flatMap((validator) => validator.validate());
}

interface SlotValidator {
  add(card: Card, quantity: number): void;
  validate(): Error[];
}

class DeckLimitsValidator implements SlotValidator {
  limitOverride: number | undefined;
  violations: Record<string, DeckLimitViolation> = {};
  quantityByName: Record<string, number> = {};
  ignoreDeckLimitSlots: Record<string, number> = {};

  constructor(deck: ResolvedDeck) {
    this.ignoreDeckLimitSlots = deck.ignoreDeckLimitSlots ?? {};
    if (deck.slots[SPECIAL_CARD_CODES.UNDERWORLD_SUPPORT]) {
      this.limitOverride = 1;
    }
  }

  add(card: Card, quantity: number) {
    if (card.xp == null) return;
    const name = SPECIAL_CARD_CODES.PRECIOUS_MEMENTOS.includes(card.code)
      ? `${displayAttribute(card, "name")} (${displayAttribute(card, "subname")})`
      : displayAttribute(card, "name");

    const limit = card.myriad ? 3 : cardLimit(card, this.limitOverride);

    // some copies of this card might be ignored, e.g. for parallel Agnes and TCU "Ace of Rods".
    const copies = quantity - (this.ignoreDeckLimitSlots[card.code] ?? 0);

    this.quantityByName[name] ??= 0;
    this.quantityByName[name] += copies;

    if (this.quantityByName[name] > limit) {
      this.violations[name] = {
        code: card.code,
        limit,
        quantity: this.quantityByName[name],
      };
    }
  }

  validate(): Error[] {
    const details = Object.values(this.violations);
    return details.length
      ? [
          {
            type: "INVALID_CARD_COUNT",
            details: details,
          },
        ]
      : [];
  }
}

class DeckRequiredCardsValidator implements SlotValidator {
  requirements: DeckRequirements;
  cards: Record<string, Card> = {};
  investigatorFront: Card;
  quantities: Record<string, number> = {};
  selectedDeckSize: number | undefined;

  constructor(deck: ResolvedDeck, mode: "slots" | "extraSlots" = "slots") {
    const investigatorBack = deck.investigatorBack.card;

    this.investigatorFront = deck.investigatorFront.card;

    const accessor =
      mode === "slots" ? "deck_requirements" : "side_deck_requirements";

    this.requirements = investigatorBack[accessor] as DeckRequirements;

    const hasDeckSizeSelect = deck.investigatorBack.card.deck_options?.some(
      (o) => o.deck_size_select,
    );

    const deckSizeSelection = deck.metaParsed.deck_size_selected;

    if (hasDeckSizeSelect && deckSizeSelection) {
      this.selectedDeckSize = Number.parseInt(deckSizeSelection, 10);
    }
  }

  add(card: Card, quantity: number) {
    if (card.xp == null) {
      this.cards[card.code] = card;
      this.quantities[card.code] = quantity;
    }
  }

  // TODO: validate that signatures are pairs.
  validate(): Error[] {
    return [
      ...this.validateCardRequirements(),
      ...this.validateRandomRequirements(),
      ...this.validateParallelFront(),
    ];
  }

  validateCardRequirements(): Error[] {
    const requirementCounts = Object.keys(this.requirements.card).reduce(
      (counts, code) => {
        counts[code] = 0;
        return counts;
      },
      {} as Record<string, number>,
    );

    const cards = Object.values(this.cards);
    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      const quantity = this.quantities[card.code];

      const matches = Object.entries(this.requirements.card).filter(
        (r) => !!r[1][card.code],
      );

      for (const match of matches) {
        requirementCounts[match[0]] += quantity;
      }
    }

    const errors = Object.entries(requirementCounts).reduce<
      DeckRequirementsNotMetError[]
    >((acc, [code, quantity]) => {
      let requiredCount = this.cards[code]?.deck_limit ?? 1;
      let mode = "loose";

      if (
        this.selectedDeckSize &&
        code === SPECIAL_CARD_CODES.OCCULT_EVIDENCE
      ) {
        requiredCount = (this.selectedDeckSize - 20) / 10;
        mode = "exact";
      } else if (code === SPECIAL_CARD_CODES.BURDEN_OF_DESTINY) {
        mode = "exact";
        requiredCount = Math.max(
          1,
          Object.values(this.cards).filter(
            (card) =>
              card.real_name === "Discipline" && this.quantities[card.code] > 0,
          ).length,
        );
      }

      const matches =
        mode === "exact"
          ? quantity === requiredCount
          : quantity >= requiredCount;

      if (!matches) {
        acc.push({
          type: "DECK_REQUIREMENTS_NOT_MET",
          details: [
            {
              code,
              quantity,
              required: requiredCount,
            },
          ],
        });
      }

      return acc;
    }, []);

    return errors;
  }

  // TODO: the rbw check is currently hardcoded as it is the only random requirement
  // and the json data structure does not allow us to sufficiently handle edge cases such as
  // "The Bell Tolls", which is a "weakness" that counts as a "basicweakness".
  validateRandomRequirements(): Error[] {
    if (!this.requirements.random?.length) return [];

    const valid =
      Object.values(this.cards).filter(isRandomBasicWeaknessLike).length > 0;

    return valid
      ? []
      : [
          {
            type: "DECK_REQUIREMENTS_NOT_MET",
            details: [
              {
                code: SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS,
                quantity: 0,
                required: 1,
              },
            ],
          },
        ];
  }

  validateParallelFront(): Error[] {
    if (
      this.investigatorFront.code === SPECIAL_CARD_CODES.PARALLEL_WENDY &&
      !this.cards[SPECIAL_CARD_CODES.TIDAL_MEMENTO]
    ) {
      return [
        {
          type: "DECK_REQUIREMENTS_NOT_MET",
          details: [
            {
              code: SPECIAL_CARD_CODES.TIDAL_MEMENTO,
              quantity: 0,
              required: 1,
            },
          ],
        },
      ];
    }

    if (this.investigatorFront.code === SPECIAL_CARD_CODES.PARALLEL_ROLAND) {
      const directiveQuantities = Object.values(this.cards).reduce(
        (acc, curr) => {
          return curr.real_name === "Directive"
            ? acc + this.quantities[curr.code]
            : acc;
        },
        0,
      );

      if (directiveQuantities !== 3) {
        return [
          {
            type: "DECK_REQUIREMENTS_NOT_MET",
            details: [
              {
                code: "90025",
                quantity: directiveQuantities,
                required: 3,
              },
            ],
          },
        ];
      }
    }

    return [];
  }
}

class DeckOptionsValidator implements SlotValidator {
  cards: Card[] = [];
  signatures: Card[] = [];
  config: InvestigatorAccessConfig;
  deckOptions: DeckOption[];
  forbidden: Card[] = [];
  lookupTables: LookupTables;
  playerCardFilter?: (card: Card) => boolean;
  quantities: Record<string, number> = {};
  signatureQuantities: Record<string, number> = {};
  weaknessFilter: (card: Card) => boolean;

  constructor(
    deck: ResolvedDeck,
    lookupTables: LookupTables,
    mode: "slots" | "extraSlots" = "slots",
  ) {
    const investigatorBack = deck.investigatorBack.card;
    this.lookupTables = lookupTables;

    const { config, deckOptions } = this.configure(deck, mode);

    this.config = config;
    this.deckOptions = deckOptions;

    this.playerCardFilter = filterInvestigatorAccess(investigatorBack, config);

    this.weaknessFilter = filterInvestigatorWeaknessAccess(investigatorBack);
  }

  configure(
    deck: ResolvedDeck,
    mode: "slots" | "extraSlots",
  ): {
    config: InvestigatorAccessConfig;
    deckOptions: DeckOption[];
  } {
    const deckOptions: DeckOption[] =
      mode === "slots"
        ? [
            {
              trait: ["Covenant"],
              limit: 1,
              virtual: true,
              error: "You cannot have more than one Covenant in your deck.",
            },
          ]
        : [];

    const options =
      mode === "slots"
        ? [...(deck.investigatorBack.card.deck_options || [])]
        : [...(deck.investigatorBack.card.side_deck_options || [])];

    deckOptions.push(...options);

    if (
      mode === "slots" &&
      deck.slots[SPECIAL_CARD_CODES.ANCESTRAL_KNOWLEDGE]
    ) {
      deckOptions.push({
        atleast: { min: 10, types: 1 },
        type: ["skill"],
        virtual: true,
        error: "Deck must have at least 10 skill cards.",
      });
    }

    const additionalDeckOptions =
      mode === "slots" ? getAdditionalDeckOptions(deck) : [];

    deckOptions.push(...additionalDeckOptions);

    return {
      config: {
        selections: deck.selections,
        customizable: {
          level: "actual",
          properties: "actual",
        },
        investigatorFront: deck.investigatorFront.card,
        additionalDeckOptions,
        targetDeck: mode === "slots" ? "slots" : "extraSlots",
      },
      deckOptions,
    };
  }

  add(card: Card, quantity: number) {
    if (card.subtype_code && !this.weaknessFilter(card)) {
      this.forbidden.push(card);
    } else if (
      !card.subtype_code &&
      (!this.playerCardFilter || !this.playerCardFilter(card))
    ) {
      this.forbidden.push(card);
    } else if ((cardLevel(card) ?? 0) > 5) {
      this.forbidden.push(card);
    } else if (card.real_text?.startsWith("Mutated. Forbidden.")) {
      this.forbidden.push(card);
      // campaign and investigator cards should not be validated against deck options.
    } else if (card.xp == null) {
      this.signatures.push(card);
      this.signatureQuantities[card.code] = quantity;
    } else {
      this.cards.push(card);
      this.quantities[card.code] = quantity;
    }
  }

  validate() {
    const errors: Error[] = [
      ...this.validateAtLeast(this.deckOptions),
      ...this.validateLimit(this.deckOptions),
    ];

    if (this.forbidden.length) {
      // since we normalize cards to their base version, a deck that contains
      // several different versions will report the same, normalize card multiple times.
      // dedupe here to avoid downstream issues.
      const uniques = this.forbidden.reduce<Record<string, Card>>(
        (acc, curr) => {
          acc[curr.code] = curr;
          return acc;
        },
        {},
      );

      errors.push({
        type: "FORBIDDEN" as const,
        details: Object.values(uniques).map((card) => ({
          code: card.code,
          real_name: card.real_name,
          target:
            this.config.targetDeck === "extraSlots"
              ? ("extraSlots" as const)
              : ("slots" as const),
        })),
      });
    }

    return errors;
  }

  validateAtLeast(options: DeckOption[]): Error[] {
    const errors: Error[] = [];

    for (const option of options) {
      if (!option.atleast) continue;
      const min = option.atleast.min;
      const factionCount = option.atleast.factions;
      const typeCount = option.atleast.types;

      const clustered: Record<string, number> = {};

      const cards = this.cards.concat(this.signatures);
      const quantities = { ...this.quantities, ...this.signatureQuantities };

      if (factionCount) {
        for (const card of cards) {
          clustered[card.faction_code] ??= 0;
          clustered[card.faction_code] += quantities[card.code];

          if (card.faction2_code) {
            clustered[card.faction2_code] ??= 0;
            clustered[card.faction2_code] += quantities[card.code];
          }

          if (card.faction3_code) {
            clustered[card.faction3_code] ??= 0;
            clustered[card.faction3_code] += quantities[card.code];
          }
        }
      } else if (typeCount) {
        for (const card of cards) {
          clustered[card.type_code] ??= 0;
          clustered[card.type_code] += quantities[card.code];
        }
      }

      const matches = Object.entries(clustered).filter(([key, val]) => {
        const target = factionCount ? option.faction : option.type;
        return target?.includes(key) && val >= min;
      });

      const target = factionCount ? factionCount : typeCount;

      let actual = matches.length;
      let required = target;

      if (required === 1) {
        const target = factionCount ? option.faction : option.type;

        if (target?.length) {
          required = option.atleast.min;

          actual = target.reduce((acc, curr) => {
            const val = clustered[curr] ?? 0;
            return val >= acc ? val : acc;
          }, 0);

          actual = clustered[target[0]];
        }
      }

      if (matches.length < (target ?? 0)) {
        errors.push({
          type: "INVALID_DECK_OPTION",
          details: {
            count: `(${actual} / ${required})`,
            error: option.error ?? "Atleast constraint violated.",
          },
        });
      }
    }

    return errors;
  }

  validateLimit(options: DeckOption[]): Error[] {
    const errors: Error[] = [];

    /**
     * Tracks which card copies have been matched by a deck option.
     * This allows us to keep track of whether any cards remain unmatched,
     * which means that they violate the deck_building restrictions.
     * Invariants:
     *  - `option.not` and `option.atleast` do not count.
     *  - `option.virtual` (used for covenants) etc. does not count.
     *  - deck_options are sorted from "unlimited > limited".
     */
    const optionMatched: Map<string, number> = new Map();

    for (let i = 0; i < options.length; i += 1) {
      const option = options[i];
      if (option.not || (option.atleast && option.virtual)) continue;

      const filter = makeOptionFilter(option as DeckOption, this.config);

      let matchCount = 0;

      const isLimitOption = !option.not && !option.virtual && option.limit;

      if (filter) {
        for (const card of this.cards) {
          const quantity = this.quantities[card.code];

          // all copies of the card fulfill a previous deck option.
          if (quantity === optionMatched.get(card.code)) continue;

          const matches = filter(card);
          // card access not given by deck_option.
          if (!matches) continue;

          for (let j = 0; j < quantity; j++) {
            const matchedQuantity = optionMatched.get(card.code) ?? 0;

            // if the current match count exceeds the limit,
            // no more cards can be covered by this option.
            if (
              matchedQuantity === quantity ||
              (isLimitOption && matchCount >= (option.limit as number))
            ) {
              break;
            }

            if (matches) matchCount += 1;

            // only mark a card as matche for "real" limit options,
            // i.e. being a covernant should not increment the limit.
            if (matches && !option.virtual && !option.not) {
              optionMatched.set(card.code, matchedQuantity + 1);
            }
          }

          // if the current match count exceeds the limit,
          // no more cards can be covered by this option.
          if (isLimitOption && matchCount >= (option.limit as number)) {
            break;
          }
        }
      }

      // virtual options are not counted towards the limit, check separately.
      if (option.virtual && matchCount > (option.limit as number)) {
        errors.push({
          type: "INVALID_DECK_OPTION",
          details: {
            count: `(${matchCount} / ${option.limit})`,
            error: option.error as string, // SAFE! all virtual limit options have error.
          },
        });
      }
    }

    const unmatchedCardCount = Object.entries(this.quantities)
      .filter(([code, quantity]) => optionMatched.get(code) !== quantity)
      .reduce(
        (acc, [code, quantity]) =>
          acc + quantity - (optionMatched.get(code) ?? 0),
        0,
      );

    if (unmatchedCardCount > 0) {
      // find the last limit option and
      const lastLimitOptionIndex = findIndexReversed(
        options,
        (o) => o.limit != null && !o.virtual && !o.atleast,
      );
      if (lastLimitOptionIndex === -1) return errors;

      const option = options[lastLimitOptionIndex];

      errors.push({
        type: "INVALID_DECK_OPTION",
        details: {
          error: option.error ?? "Too many off-class cards.",
          count: `(${(option.limit ?? 0) + unmatchedCardCount} / ${option.limit})`,
        },
      });
    }

    return errors;
  }
}

class SideDeckLimitsValidator implements SlotValidator {
  cards: Card[] = [];
  quantities: number[] = [];

  add(card: Card, quantity: number) {
    if (card.subtype_code !== "basicweakness") {
      this.cards.push(card);
      this.quantities.push(quantity);
    }
  }

  validate(): Error[] {
    const errors: Error[] = [];

    for (let i = 0; i < this.cards.length; i += 1) {
      const card = this.cards[i];
      const quantity = this.quantities[i];

      if (quantity > 1 && card.xp != null) {
        errors.push({
          type: "INVALID_CARD_COUNT",
          details: [
            {
              code: card.code,
              limit: 1,
              quantity,
            },
          ],
        });
      }
    }

    return errors;
  }
}
