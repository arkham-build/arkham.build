import type {
  ApiDeckRequirements,
  Card,
  DeckOption,
} from "@arkham-build/shared";
import {
  cardLevel,
  cardLimit,
  isRandomBasicWeaknessLike,
  isStaticInvestigator,
  splitMultiValue,
} from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { range } from "@/utils/range";
import { time, timeEnd } from "@/utils/time";
import type { Metadata } from "../slices/metadata.types";
import type { Interpreter } from "./buildql/interpreter";
import type { InvestigatorAccessConfig } from "./filtering";
import {
  filterCardPool,
  filterInvestigatorAccess,
  filterInvestigatorWeaknessAccess,
  makeOptionFilter,
} from "./filtering";
import type { LookupTables } from "./lookup-tables.types";
import type { DeckMeta, ResolvedDeck } from "./types";

export type DeckValidationResult = {
  valid: boolean;
  errors: DeckValidationError[];
};

export type ValidationError =
  | "DECK_REQUIREMENTS_NOT_MET"
  | "FORBIDDEN"
  | "CARD_NOT_IN_LIMITED_POOL"
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
    real_name: string;
    target: "slots" | "extraSlots";
  }[];
};

export type CardNotInLimitedPoolError = {
  type: "CARD_NOT_IN_LIMITED_POOL";
  details: {
    code: string;
    real_name: string;
    xp: number;
  }[];
};

export function isTooManyCardsError(
  error: DeckValidationError,
): error is TooManyCardsError {
  return error.type === "TOO_MANY_CARDS";
}

export function isDeckOptionsError(
  error: DeckValidationError,
): error is DeckOptionsError {
  return error.type === "INVALID_DECK_OPTION";
}

export function isInvalidCardCountError(
  error: DeckValidationError,
): error is InvalidCardError {
  return error.type === "INVALID_CARD_COUNT";
}

export function isForbiddenCardError(
  error: DeckValidationError,
): error is ForbiddenCardError {
  return error.type === "FORBIDDEN";
}

export function isCardNotInLimitedPoolError(
  error: DeckValidationError,
): error is CardNotInLimitedPoolError {
  return error.type === "CARD_NOT_IN_LIMITED_POOL";
}

export function isTooFewCardsError(
  error: DeckValidationError,
): error is TooFewCardsError {
  return error.type === "TOO_FEW_CARDS";
}

export function isDeckRequirementsNotMetError(
  error: DeckValidationError,
): error is DeckRequirementsNotMetError {
  return error.type === "DECK_REQUIREMENTS_NOT_MET";
}

export function isInvalidInvestigatorError(
  error: DeckValidationError,
): error is BaseError & { type: "INVALID_INVESTIGATOR" } {
  return error.type === "INVALID_INVESTIGATOR";
}

export type DeckValidationError =
  | BaseError
  | InvalidCardError
  | ForbiddenCardError
  | CardNotInLimitedPoolError
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

function formatReturnValue(errors: DeckValidationError[]) {
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
  buildQlInterpreter: Interpreter,
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

  const errors: DeckValidationError[] = [
    ...validateDeckSize(deck),
    ...validateSlots(deck, metadata, lookupTables, buildQlInterpreter),
  ];

  if (deck.hasExtraDeck) {
    errors.push(...validateExtraDeckSize(deck));
    errors.push(
      ...validateSlots(
        deck,
        metadata,
        lookupTables,
        buildQlInterpreter,
        "extraSlots",
      ),
    );
  }

  if (deck.cardPool?.length) {
    errors.push(...validateLimitedCardPool(deck, metadata, lookupTables));
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
  ) {
    return false;
  }

  let valid = true;

  for (const option of investigatorBack.deck_options) {
    if (option.deck_size_select) {
      valid = !!deck.metaParsed.deck_size_selected;
    } else if (option.faction_select) {
      valid =
        !!(option.id && deck.metaParsed[option.id as keyof DeckMeta]) ||
        !!deck.metaParsed.faction_selected ||
        (!!deck.metaParsed.faction_1 && !!deck.metaParsed.faction_2);
    } else if (option.option_select) {
      const key = option.id ?? "option_selected";
      valid = !!deck.metaParsed[key as keyof DeckMeta];
    }

    if (!valid) break;
  }

  return valid;
}

function validateDeckSize(deck: ResolvedDeck): DeckValidationError[] {
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

  const adjustment = Object.entries(deck.slots).reduce<number>(
    (acc, [code, quantity]) => {
      if (!quantity) return acc;

      const deckSizeAdjust =
        deck.cards.slots[code]?.card?.deck_requirements?.size;
      if (deckSizeAdjust != null) return acc + deckSizeAdjust * quantity;

      return acc;
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

function validateExtraDeckSize(deck: ResolvedDeck): DeckValidationError[] {
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

function validateLimitedCardPool(
  deck: ResolvedDeck,
  metadata: Metadata,
  lookupTables: LookupTables,
): DeckValidationError[] {
  const cardPoolFilter = filterCardPool(deck.cardPool, metadata, lookupTables);

  const limitedPoolFilter = (c: Card) => {
    if (!cardPoolFilter || cardPoolFilter(c)) return true;
    const duplicates = lookupTables.relations.duplicates[c.code];
    if (!duplicates) return false;
    return Object.keys(duplicates).some((code) =>
      cardPoolFilter(metadata.cards[code]),
    );
  };

  const limitedPoolViolation: Card[] = [
    ...Object.values(deck.cards["slots"]),
    ...Object.values(deck.cards["sideSlots"]),
    ...Object.values(deck.cards["extraSlots"]),
  ]
    .map((se) => se.card)
    .filter(
      (card) =>
        card.xp != null &&
        !limitedPoolFilter(card) &&
        (deck.slots[card.code] ||
          deck.sideSlots?.[card.code] ||
          deck.extraSlots?.[card.code]),
    );

  const errors: DeckValidationError[] = [];
  if (limitedPoolViolation.length) {
    errors.push({
      type: "CARD_NOT_IN_LIMITED_POOL" as const,
      details: Object.values(limitedPoolViolation).map((card) => ({
        code: card.code,
        real_name: card.real_name,
        xp: card.xp ? card.xp : 0,
      })),
    });
  }
  return errors;
}

function validateSlots(
  deck: ResolvedDeck,
  metadata: Metadata,
  lookupTables: LookupTables,
  buildQlInterpreter: Interpreter,
  mode: "slots" | "extraSlots" = "slots",
): DeckValidationError[] {
  const validators: SlotValidator[] = [
    new DeckLimitsValidator(deck),
    new DeckRequiredCardsValidator(deck, lookupTables, mode),
    new DeckOptionsValidator(deck, lookupTables, buildQlInterpreter, mode),
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
  validate(): DeckValidationError[];
}

class DeckLimitsValidator implements SlotValidator {
  limitOverride: number | undefined;
  violations: Record<string, DeckLimitViolation> = {};
  quantityByName: Record<string, number> = {};
  ignoreDeckLimitSlots: Record<string, number> = {};
  eldritchBranded?: string;

  constructor(deck: ResolvedDeck) {
    this.ignoreDeckLimitSlots = deck.ignoreDeckLimitSlots ?? {};

    if (deck.slots[SPECIAL_CARD_CODES.UNDERWORLD_SUPPORT]) {
      this.limitOverride = 1;
    }

    this.eldritchBranded = this.parseBrandedCard(deck);
  }

  add(card: Card, quantity: number) {
    if (card.xp == null) return;

    const name = SPECIAL_CARD_CODES.PRECIOUS_MEMENTOS.includes(card.code)
      ? `${card.real_name} (${card.real_subname})`
      : card.real_name;

    const limit = this.getCardLimit(card);

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

  validate(): DeckValidationError[] {
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

  private getCardLimit(card: Card): number {
    if (card.myriad) return this.limitOverride ?? 3;
    if (this.eldritchBranded && card.code === this.eldritchBranded) return 1;
    return cardLimit(card, this.limitOverride);
  }

  private parseBrandedCard(deck: ResolvedDeck) {
    const branded = deck.attachments?.[SPECIAL_CARD_CODES.ELDRITCH_BRAND];

    if (!deck.slots[SPECIAL_CARD_CODES.ELDRITCH_BRAND] || !branded) {
      return;
    }

    for (const [code, quantity] of Object.entries(branded)) {
      if (quantity > 0) return code;
    }
  }
}

class DeckRequiredCardsValidator implements SlotValidator {
  cards: Record<string, Card> = {};
  investigatorFront: Card;
  lookupTables: LookupTables;
  quantities: Record<string, number> = {};
  requirements: ApiDeckRequirements;
  selectedDeckSize: number | undefined;

  constructor(
    deck: ResolvedDeck,
    lookupTables: LookupTables,
    mode: "slots" | "extraSlots" = "slots",
  ) {
    const investigatorBack = deck.investigatorBack.card;
    this.investigatorFront = deck.investigatorFront.card;

    this.lookupTables = lookupTables;

    const accessor =
      mode === "slots" ? "deck_requirements" : "side_deck_requirements";

    this.requirements = investigatorBack[accessor] as ApiDeckRequirements;

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
  validate(): DeckValidationError[] {
    return [
      ...this.validateCardRequirements(),
      ...this.validateRandomRequirements(),
      ...this.validateParallelFront(),
    ];
  }

  validateCardRequirements(): DeckValidationError[] {
    const requirementCounts = Object.keys(this.requirements.card ?? {}).reduce(
      (counts, code) => {
        counts[code] = 0;
        return counts;
      },
      {} as Record<string, number>,
    );

    const cards = Object.values(this.cards);
    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];

      const allCardVersions = [
        card.code,
        ...Object.keys(this.lookupTables.relations.duplicates[card.code] ?? {}),
      ];

      const quantity = allCardVersions.reduce(
        (acc, curr) => acc + (this.quantities[curr] ?? 0),
        0,
      );

      const matches = Object.entries(this.requirements.card ?? {}).filter((r) =>
        allCardVersions.some((code) => !!r[1][code]),
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
  validateRandomRequirements(): DeckValidationError[] {
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

  validateParallelFront(): DeckValidationError[] {
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
  buildQlInterpreter: Interpreter;
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
    buildQlInterpreter: Interpreter,
    mode: "slots" | "extraSlots" = "slots",
  ) {
    const investigatorBack = deck.investigatorBack.card;
    this.lookupTables = lookupTables;

    const { config, deckOptions } = this.configure(deck, mode);

    this.config = config;
    this.deckOptions = deckOptions;
    this.buildQlInterpreter = buildQlInterpreter;

    this.playerCardFilter = filterInvestigatorAccess(
      investigatorBack,
      buildQlInterpreter,
      config,
    );
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
    } else if (this.isForbiddenByTrait(card)) {
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

  isForbiddenByTrait(card: Card) {
    return card.real_text?.includes("Forbidden.");
  }

  validate() {
    const errors: DeckValidationError[] = [
      ...this.validateAtLeast(this.deckOptions),
      ...this.validateVirtualLimit(this.deckOptions),
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

  validateAtLeast(options: DeckOption[]): DeckValidationError[] {
    const errors: DeckValidationError[] = [];

    for (const option of options) {
      if (!option.atleast) continue;
      const min = option.atleast.min;
      const factionCount = option.atleast.factions;
      const traitCount = option.atleast.traits;
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
      } else if (traitCount) {
        for (const card of cards) {
          const traits = splitMultiValue(card.real_traits);
          for (const trait of traits) {
            clustered[trait] ??= 0;
            clustered[trait] += quantities[card.code];
          }
        }
      }

      const targetOption = option.faction ?? option.type ?? option.trait;
      const targetCount = factionCount ?? typeCount ?? traitCount;

      const matches = Object.entries(clustered).filter(([key, val]) => {
        return targetOption?.includes(key) && val >= min;
      });

      let actual = matches.length;
      let required = targetCount;

      if (required === 1) {
        if (targetOption?.length) {
          required = option.atleast.min;

          actual = targetOption.reduce((acc, curr) => {
            const val = clustered[curr] ?? 0;
            return val >= acc ? val : acc;
          }, 0);
        }
      }

      if (matches.length < (targetCount ?? 0)) {
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

  /**
   * Validates virtual deck options (e.g. Covenants) independently.
   * Virtual options impose limits (e.g. max 1 Covenant card) without
   * interacting with the regular deck option matching tracked in `validateLimit`.
   */
  validateVirtualLimit(options: DeckOption[]): DeckValidationError[] {
    const errors: DeckValidationError[] = [];

    for (const option of options) {
      if (!option.virtual || option.atleast) continue;

      const filter = makeOptionFilter(
        option as DeckOption,
        this.buildQlInterpreter,
        this.config,
      );
      if (!filter) continue;

      let matchCount = 0;

      for (const card of this.cards) {
        if (filter(card)) {
          matchCount += this.quantities[card.code];
        }
      }

      if (matchCount > (option.limit as number)) {
        errors.push({
          type: "INVALID_DECK_OPTION",
          details: {
            count: `(${matchCount} / ${option.limit})`,
            error: option.error as string, // SAFE! all virtual limit options have error.
          },
        });
      }
    }

    return errors;
  }

  validateLimit(options: DeckOption[]): DeckValidationError[] {
    const errors: DeckValidationError[] = [];

    /**
     * Tracks which card copies have been matched by a deck option.
     * This allows us to keep track of whether any cards remain unmatched,
     * which means that they violate the deck_building restrictions.
     * Invariants:
     *  - `option.atleast` are ignored.
     *  - `option.virtual` (used for covenants) etc. are validated in `validateVirtualLimit`.
     *  - deck_options are sorted from "unlimited > limited".
     */
    const optionMatched = new Map<string, number>();

    /**
     * Once a card matches a `not` deck option, no further options can match it.
     * This is relevant when a limit option precedes a `not` option and a later filter would match it as well.
     * This does not occur in official content, but it does occur in fan-made content.
     */
    const exclusions = new Set<string>();

    for (let i = 0; i < options.length; i += 1) {
      const option = options[i];
      if (option.virtual) continue;

      const filter = makeOptionFilter(
        option as DeckOption,
        this.buildQlInterpreter,
        this.config,
      );

      let matchCount = 0;

      const isLimitOption = !option.not && option.limit;

      if (filter) {
        for (const card of this.cards) {
          if (exclusions.has(card.code)) continue;

          const quantity = this.quantities[card.code];

          // all copies of the card fulfill a previous deck option.
          if (quantity === optionMatched.get(card.code)) continue;

          const matches = filter(card);
          // card access not given by deck_option.
          if (!matches) continue;

          if (matches && option.not) {
            exclusions.add(card.code);
            continue;
          }

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

            if (matches && !option.not) {
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
    }

    const unmatchedCardCount = Object.entries(this.quantities)
      .filter(([code, quantity]) => optionMatched.get(code) !== quantity)
      .reduce(
        (acc, [code, quantity]) =>
          acc + quantity - (optionMatched.get(code) ?? 0),
        0,
      );

    if (unmatchedCardCount > 0) {
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

  validate(): DeckValidationError[] {
    const errors: DeckValidationError[] = [];

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
