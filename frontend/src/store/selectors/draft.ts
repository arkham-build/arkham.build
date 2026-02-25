import type {
  Card,
  DeckOption,
  SealedDeckResponse,
} from "@arkham-build/shared";
import { createSelector } from "reselect";
import { applyCardChanges } from "@/store/lib/card-edits";
import {
  filterCardPool,
  filterDuplicates,
  filterInvestigatorAccess,
  filterOwnership,
  filterSealed,
  makeOptionFilter,
} from "@/store/lib/filtering";
import { resolveCardWithRelations } from "@/store/lib/resolve-card";
import type {
  CardSet,
  CardWithRelations,
  ResolvedCard,
} from "@/store/lib/types";
import type { StoreState } from "@/store/slices";
import { assert } from "@/utils/assert";
import { cardLimit, realCardLevel } from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { currentEnvironmentPacks } from "@/utils/environments";
import { formatRelationTitle } from "@/utils/formatting";
import { and, or } from "@/utils/fp";
import i18n from "@/utils/i18n";
import {
  selectCollection,
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "./shared";

export function selectDraftChecked(state: StoreState) {
  const { draft } = state;
  assert(draft, "Draft must be initialized.");
  return draft;
}

export const selectDraftInvestigators = createSelector(
  selectDraftChecked,
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (draft, metadata, lookupTables, collator) => {
    return Object.entries({
      investigator: draft.investigatorCode,
      back: draft.investigatorBackCode,
      front: draft.investigatorFrontCode,
    }).reduce(
      (acc, [key, code]) => {
        const card = resolveCardWithRelations(
          { metadata, lookupTables },
          collator,
          code,
          draft.tabooSetId,
          undefined,
          true,
        );

        assert(card, `${key} card must be resolved.`);

        acc[key] = card;
        return acc;
      },
      {} as Record<string, CardWithRelations>,
    );
  },
);

/**
 * Select the base pool of cards available for drafting.
 * Filters for investigator-legal, owned cards that are not signatures or weaknesses.
 * This doesn't account for faction limits or deck size adjustments - use selectAvailableDraftCards for that.
 */
export const selectDraftCardPool = createSelector(
  [
    selectMetadata,
    selectLookupTables,
    selectCollection,
    (state: StoreState) => state.settings.showAllCards,
    (state: StoreState) => state.settings.defaultEnvironment,
    (_: StoreState, investigatorCode: string) => investigatorCode,
    (
      _: StoreState,
      _investigatorCode: string,
      additionalDeckOptions: DeckOption[] = [],
    ) => additionalDeckOptions,
    (
      _: StoreState,
      _investigatorCode: string,
      _additionalDeckOptions: DeckOption[],
      cardPool: string[] | undefined | null,
    ) => cardPool,
    (
      _: StoreState,
      _investigatorCode: string,
      _additionalDeckOptions: DeckOption[],
      _cardPool: string[] | undefined | null,
      sealed: SealedDeckResponse | undefined,
    ) => sealed,
    (
      _: StoreState,
      _investigatorCode: string,
      _additionalDeckOptions: DeckOption[],
      _cardPool: string[] | undefined | null,
      _sealed: SealedDeckResponse | undefined,
      tabooSetId: number | undefined,
    ) => tabooSetId,
    (
      _: StoreState,
      _investigatorCode: string,
      _additionalDeckOptions: DeckOption[],
      _cardPool: string[] | undefined | null,
      _sealed: SealedDeckResponse | undefined,
      _tabooSetId: number | undefined,
      remainingXp: number | undefined,
    ) => remainingXp,
    (state: StoreState) => state.draft?.researchedCards ?? [],
  ],
  (
    metadata,
    lookupTables,
    collection,
    showAllCards,
    defaultEnvironment,
    investigatorCode,
    additionalDeckOptions,
    cardPool: string[] | undefined | null,
    sealed: SealedDeckResponse | undefined,
    tabooSetId: number | undefined,
    remainingXp: number | undefined,
    researchedCards: string[],
  ) => {
    const investigator = metadata.cards[investigatorCode];
    if (!investigator) return [];

    const cardAccessFilter = filterInvestigatorAccess(investigator, {
      additionalDeckOptions,
    });
    if (!cardAccessFilter) return [];

    const filters = [
      filterDuplicates,
      // Filter by card level based on mode
      // For upgrade mode: show cards with XP 1 to remainingXp
      // For new draft mode: show only level 0 cards
      (c: Card) => {
        const level = realCardLevel(c);
        if (remainingXp !== undefined && remainingXp > 0) {
          // Upgrade mode: show cards with XP between 1 and remainingXp
          if (level === null || level === undefined || level === 0)
            return false;
          return level <= remainingXp;
        }
        // New draft mode: only level 0 cards
        return level === 0 || level === null;
      },
      cardAccessFilter,
      // Exclude signatures (cards restricted to specific investigators)
      (c: Card) => !c.restrictions?.investigator,
      // Exclude weaknesses
      (c: Card) => !c.subtype_code,
      // Exclude special cards like random basic weakness placeholder
      (c: Card) => c.code !== SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS,
    ];

    // Apply card pool filter
    // cardPool === undefined: use default environment from settings (if set)
    // cardPool === null: user explicitly cleared it, no filter (all cards available)
    // cardPool === [...]: user manually selected packs OR initialized from settings, filter to those packs
    let effectiveCardPool: string[] | undefined;

    if (cardPool === null) {
      // User explicitly cleared card pool - no filter
      effectiveCardPool = undefined;
    } else if (cardPool !== undefined && cardPool.length > 0) {
      // User manually selected packs OR initialized from settings - use those packs
      effectiveCardPool = cardPool;
    } else if (cardPool === undefined && defaultEnvironment === "current") {
      // No cardPool set and default environment is "current" - use current environment packs
      effectiveCardPool = currentEnvironmentPacks(
        Object.values(metadata.cycles),
      );
    }

    // Determine if user manually selected a card pool (not using default environment)
    const hasManualCardPool =
      cardPool !== undefined && cardPool !== null && cardPool.length > 0;
    const hasSealedDeck = sealed !== undefined && sealed.cards !== undefined;

    // Apply ownership filter unless "show all cards" is enabled OR user manually selected a card pool OR sealed deck is set
    // When user manually selects packs or sealed deck, they should see all cards regardless of collection
    if (!showAllCards && !hasManualCardPool && !hasSealedDeck) {
      filters.push((c: Card) =>
        filterOwnership({
          card: c,
          metadata,
          lookupTables,
          collection,
          showAllCards: false,
        }),
      );
    }

    // Sealed deck takes priority - if sealed deck is set, only show cards from sealed deck
    if (hasSealedDeck) {
      const sealedFilter = filterSealed(sealed.cards, lookupTables);
      filters.push(sealedFilter);
    } else if (effectiveCardPool && effectiveCardPool.length > 0) {
      // Only apply card pool filter if no sealed deck is set
      const cardPoolFilter = filterCardPool(
        effectiveCardPool,
        metadata,
        lookupTables,
      );
      if (cardPoolFilter) {
        // Allow cards in the pool, signatures, and campaign cards (xp == null with restrictions)
        filters.push(
          or([
            cardPoolFilter,
            (c: Card) =>
              !!c.restrictions?.investigator ||
              (c.xp == null &&
                !!c.restrictions &&
                !c.duplicate_of_code &&
                c.subtype_code !== "basicweakness"),
          ]),
        );
      }
    }

    let filteredCards = Object.values(metadata.cards);

    // Apply taboo changes to cards before filtering (similar to selectBaseListCards)
    if (tabooSetId) {
      filteredCards = filteredCards.map((c) =>
        applyCardChanges(c, metadata, tabooSetId, undefined),
      );
    }

    // Filter out forbidden cards (cards with "Forbidden." in their text after taboo changes)
    filters.push((c: Card) => {
      // Check if card is forbidden by taboo - forbidden cards have "Forbidden." in their real_text
      return !c.real_text?.includes("Forbidden.");
    });

    // Filter out researched upgrades if the base card hasn't been researched
    // Only apply this filter in upgrade mode
    // Always filter out researched cards unless their base is selected
    if (remainingXp !== undefined && remainingXp > 0) {
      filters.push((c: Card) => {
        // Check if this card has "Researched." in its text
        if (!c.real_text?.includes("Researched.")) {
          return true; // Not a researched card, allow it
        }

        // This is a researched card - find the base version (same real_name without "Researched." text)
        const baseCard = Object.values(metadata.cards).find(
          (card) =>
            card.real_name === c.real_name &&
            !card.real_text?.includes("Researched."),
        );

        if (!baseCard) {
          return false; // Base card not found, exclude it
        }

        // Only allow researched cards if their base card is in the researched cards list
        return researchedCards.includes(baseCard.code);
      });
    }

    return filteredCards.filter(and(filters));
  },
);

/**
 * Select available draft cards, filtering out cards from factions that have reached their limit.
 * Also filters out cards that have reached their deck limit.
 * Uses the same logic as deck validation - cards are matched to options in order.
 */
export const selectAvailableDraftCards = createSelector(
  [
    selectMetadata,
    (
      state: StoreState,
      investigatorCode: string,
      _pickedCards: Record<string, number>,
      additionalDeckOptions: DeckOption[],
    ) => {
      const cardPool = state.draft?.cardPool;
      const sealed = state.draft?.sealed;
      const tabooSetId = state.draft?.tabooSetId;
      const remainingXp =
        state.draft?.mode === "upgrade" ? state.draft.remainingXp : undefined;
      return selectDraftCardPool(
        state,
        investigatorCode,
        additionalDeckOptions,
        cardPool,
        sealed,
        tabooSetId,
        remainingXp,
      );
    },
    (_: StoreState, investigatorCode: string) => investigatorCode,
    (
      _: StoreState,
      _investigatorCode: string,
      pickedCards: Record<string, number>,
    ) => pickedCards,
    (
      _: StoreState,
      _investigatorCode: string,
      _pickedCards: Record<string, number>,
      additionalDeckOptions: DeckOption[],
    ) => additionalDeckOptions,
  ],
  (
    metadata,
    cardPool,
    investigatorCode,
    pickedCards,
    additionalDeckOptions,
  ) => {
    const investigator = metadata.cards[investigatorCode];
    if (!investigator) return [];

    // Get the back card where deck_options are defined
    const backCardCode = investigator.back_link_id ?? investigatorCode;
    const backCard = metadata.cards[backCardCode];
    if (!backCard || !backCard.deck_options) return cardPool;

    // Combine investigator deck options with additional deck options from picked cards
    // (same logic as getAdditionalDeckOptions and makePlayerCardsFilter)
    const allDeckOptions = [...backCard.deck_options, ...additionalDeckOptions];

    // Build list of all options with their filters (same as deck validation)
    const optionsWithFilters: Array<{
      option: DeckOption;
      filter: NonNullable<ReturnType<typeof makeOptionFilter>>;
      index: number;
    }> = [];

    for (let i = 0; i < allDeckOptions.length; i++) {
      const option = allDeckOptions[i];
      if (option.atleast && option.virtual) continue;

      const filter = makeOptionFilter(option, {
        showLimitedAccess: true,
      });

      if (filter) {
        optionsWithFilters.push({ option, filter, index: i });
      }
    }

    // Simulate card-to-option matching (same logic as mapCardsToDeckOptions)
    // This tells us which cards are matched to which options
    const optionMatched = new Map<string, number>();
    const limitOptionCounts = new Map<number, number>();

    for (const { option, filter, index } of optionsWithFilters) {
      const isLimitOption = !option.not && !option.virtual && !!option.limit;
      let matchCount = 0;

      // Process picked cards in order
      for (const [code, quantity] of Object.entries(pickedCards)) {
        const card = metadata.cards[code];
        if (!card) continue;

        // All copies of this card have been matched to previous options
        const matchedQuantity = optionMatched.get(code) ?? 0;
        if (matchedQuantity >= quantity) continue;

        if (!filter) continue;
        if (filter(card)) {
          // Card matches this option
          if (option.not) {
            // NOT options exclude cards - they can't be matched to later options
            optionMatched.set(code, quantity);
            continue;
          }

          // Match as many copies as possible to this option
          const remainingQuantity = quantity - matchedQuantity;
          let copiesToMatch = remainingQuantity;

          // For limit options, don't exceed the limit
          if (isLimitOption && matchCount >= (option.limit as number)) {
            copiesToMatch = 0;
          } else if (isLimitOption) {
            const availableLimit = (option.limit as number) - matchCount;
            copiesToMatch = Math.min(copiesToMatch, availableLimit);
          }

          if (copiesToMatch > 0) {
            optionMatched.set(code, matchedQuantity + copiesToMatch);
            matchCount += copiesToMatch;
          }
        }
      }

      if (isLimitOption) {
        limitOptionCounts.set(index, matchCount);
      }
    }

    // Now filter available cards - exclude a card if:
    // 1. It has reached its deck limit, OR
    // 2. It matches a limit option that is full AND can't be matched to any unlimited option
    return cardPool.filter((card) => {
      // Check deck limit
      const currentQuantity = pickedCards[card.code] ?? 0;
      const limit = cardLimit(card);
      if (currentQuantity >= limit) return false;

      // Check if card matches any limit option that's full
      for (const { option, filter, index } of optionsWithFilters) {
        const isLimitOption = !option.not && !option.virtual && !!option.limit;
        if (!isLimitOption || !filter) continue;

        if (!filter(card)) continue;

        // Card matches this limit option
        const currentLimitCount = limitOptionCounts.get(index) ?? 0;
        const limitValue = option.limit as number;

        // Simulate adding this card - would it exceed the limit?
        // Check how many copies of this card are already matched to this option
        const cardMatchedToThisOption = optionMatched.get(card.code) ?? 0;
        const cardQuantity = pickedCards[card.code] ?? 0;

        // If all copies are already matched to this option, adding more would exceed
        if (cardMatchedToThisOption >= cardQuantity) {
          // Check if adding one more would exceed the limit
          if (currentLimitCount >= limitValue) {
            // This limit option is full, but check if card matches any unlimited option
            let matchesUnlimitedOption = false;
            for (const {
              option: otherOption,
              filter: otherFilter,
            } of optionsWithFilters) {
              const isOtherLimitOption =
                !otherOption.not && !otherOption.virtual && !!otherOption.limit;
              if (isOtherLimitOption) continue; // Skip limit options
              if (otherFilter(card)) {
                matchesUnlimitedOption = true;
                break;
              }
            }

            // Only exclude if card doesn't match any unlimited option
            if (!matchesUnlimitedOption) {
              return false;
            }
          }
        } else {
          // Card not fully matched to this option yet
          // Check if adding one more copy would exceed the limit
          const simulatedCount = currentLimitCount + 1;
          if (simulatedCount > limitValue) {
            // Would exceed limit - check if card matches unlimited options
            let matchesUnlimitedOption = false;
            for (const {
              option: otherOption,
              filter: otherFilter,
            } of optionsWithFilters) {
              const isOtherLimitOption =
                !otherOption.not && !otherOption.virtual && !!otherOption.limit;
              if (isOtherLimitOption || !otherFilter) continue;
              if (otherFilter(card)) {
                matchesUnlimitedOption = true;
                break;
              }
            }

            if (!matchesUnlimitedOption) {
              return false;
            }
          }
        }
      }

      return true;
    });
  },
);

/**
 * Get the signature cards for an investigator.
 * These are automatically added to the draft deck and don't count toward deck size.
 */
export const selectSignatureCards = createSelector(
  [
    selectMetadata,
    selectLookupTables,
    selectLocaleSortingCollator,
    (_: StoreState, investigatorCode: string) => investigatorCode,
  ],
  (metadata, lookupTables, collator, investigatorCode) => {
    const signatureCards: Record<string, number> = {};
    const investigator = metadata.cards[investigatorCode];

    if (!investigator) return signatureCards;

    // Get the back card code - this is where deck_requirements are defined
    // For double-sided investigators, we need the back card
    const backCardCode = investigator.back_link_id ?? investigatorCode;
    const backCard = metadata.cards[backCardCode];
    if (!backCard) return signatureCards;

    // Resolve the BACK card with relations to get requiredCards
    // requiredCards are keyed by the back card code in lookup tables
    const backCardWithRelations = resolveCardWithRelations(
      { metadata, lookupTables },
      collator,
      backCardCode,
      undefined,
      undefined,
      true,
    );

    // Get signature cards from relations (preferred method)
    // Use the back card's relations, which should include requiredCards
    if (backCardWithRelations?.relations?.requiredCards) {
      for (const { card } of backCardWithRelations.relations.requiredCards) {
        // Use card.quantity (typically 1 for signature cards)
        // Handle special case for Occult Evidence which has variable quantity
        let quantity = card.quantity ?? 1;

        // Occult Evidence quantity is calculated based on deck size
        if (card.code === SPECIAL_CARD_CODES.OCCULT_EVIDENCE) {
          const baseDeckSize = backCard.deck_requirements?.size ?? 30;
          quantity = Math.max(1, Math.floor((baseDeckSize - 20) / 10));
        }

        signatureCards[card.code] = quantity;
      }
    }

    // Fallback: if relations didn't work, read directly from deck_requirements.card
    // This ensures we always get signature cards even if lookup tables aren't populated
    if (
      Object.keys(signatureCards).length === 0 &&
      backCard.deck_requirements?.card
    ) {
      for (const code of Object.keys(backCard.deck_requirements.card)) {
        const card = metadata.cards[code];
        if (card) {
          // Use the card's quantity property (typically 1 for signature cards)
          let quantity = card.quantity ?? 1;

          // Handle Occult Evidence special case
          if (code === SPECIAL_CARD_CODES.OCCULT_EVIDENCE) {
            const baseDeckSize = backCard.deck_requirements?.size ?? 30;
            quantity = Math.max(1, Math.floor((baseDeckSize - 20) / 10));
          }

          signatureCards[code] = quantity;
        }
      }
    }

    // Add random basic weakness placeholder
    // This doesn't count toward deck size but is added to the deck
    // Use back card's deck_requirements (same as deck-create)
    const randomWeaknessCount = backCard.deck_requirements?.random?.length ?? 1;
    signatureCards[SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS] =
      randomWeaknessCount;

    return signatureCards;
  },
);

export const selectDraftCardSets = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  selectDraftChecked,
  selectDraftInvestigators,
  (metadata, lookupTables, collator, draft, investigators) => {
    const groupings: CardSet[] = [];

    const { back, investigator } = investigators;
    const { relations } = investigator;

    if (relations?.advanced?.length) {
      groupings.push({
        id: "advanced",
        title: formatRelationTitle("advanced"),
        canSelect: true,
        cards: relations.advanced,
        selected: draft.sets.includes("advanced"),
        quantities: relations.advanced.reduce(
          (acc, { card }) => {
            acc[card.code] = card.quantity;
            return acc;
          },
          {} as Record<string, number>,
        ),
        help: i18n.t("deck_create.help_advanced"),
      });
    }

    if (relations?.replacement?.length) {
      groupings.push({
        id: "replacement",
        title: formatRelationTitle("replacement"),
        canSelect: true,
        cards: relations.replacement,
        selected: draft.sets.includes("replacement"),
        quantities: relations.replacement.reduce(
          (acc, { card }) => {
            acc[card.code] = card.quantity;
            return acc;
          },
          {} as Record<string, number>,
        ),
        help: i18n.t("deck_create.help_replacements"),
      });
    }

    if (relations?.requiredCards) {
      groupings.unshift({
        id: "requiredCards",
        canSelect: true,
        cards: relations.requiredCards,
        title: formatRelationTitle("requiredCards"),
        selected: draft.sets.includes("requiredCards"),
        quantities: relations.requiredCards.reduce(
          (acc, { card }) => {
            acc[card.code] = card.quantity;
            return acc;
          },
          {} as Record<string, number>,
        ),
      });
    }

    groupings.unshift({
      id: "random_basic_weakness",
      title: i18n.t("deck_create.random_basic_weakness"),
      canSelect: false,
      selected: true,
      cards: [
        resolveCardWithRelations(
          { metadata, lookupTables },
          collator,
          SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS,
          undefined,
        ) as ResolvedCard,
      ],
      quantities: {
        [SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS]:
          back.card.deck_requirements?.random?.length ?? 1,
      },
    });

    return groupings;
  },
);

/**
 * Get debug information about draft card availability and limits.
 * Useful for troubleshooting why cards aren't showing up.
 */
export const selectDraftDebugInfo = createSelector(
  [
    selectMetadata,
    (
      state: StoreState,
      investigatorCode: string,
      _pickedCards: Record<string, number>,
    ) => {
      const cardPool = state.draft?.cardPool;
      const sealed = state.draft?.sealed;
      const tabooSetId = state.draft?.tabooSetId;
      return selectDraftCardPool(
        state,
        investigatorCode,
        [],
        cardPool,
        sealed,
        tabooSetId,
        undefined,
      );
    },
    (
      _: StoreState,
      investigatorCode: string,
      _pickedCards: Record<string, number>,
    ) => investigatorCode,
    (
      _: StoreState,
      _investigatorCode: string,
      pickedCards: Record<string, number>,
    ) => pickedCards,
  ],
  (metadata, cardPool, investigatorCode, pickedCards) => {
    const investigator = metadata.cards[investigatorCode];
    if (!investigator) {
      return {
        basePoolSize: 0,
        availableCardsSize: 0,
        limitOptions: [],
        investigatorCode,
      };
    }

    // Get the back card where deck_options are defined
    const backCardCode = investigator.back_link_id ?? investigatorCode;
    const backCard = metadata.cards[backCardCode];

    if (!backCard || !backCard.deck_options) {
      return {
        basePoolSize: cardPool.length,
        availableCardsSize: cardPool.length,
        limitOptions: [],
        investigatorCode,
        backCardCode,
      };
    }

    // Build list of limit options with their filters
    const limitOptions: Array<{
      option: (typeof backCard.deck_options)[0];
      filter: ReturnType<typeof makeOptionFilter>;
      currentCount: number;
    }> = [];

    for (const option of backCard.deck_options) {
      if (!option.limit || option.not || option.virtual) continue;

      const filter = makeOptionFilter(option, {
        showLimitedAccess: true,
      });
      if (filter) {
        // Count current matches
        let currentCount = 0;
        for (const [code, quantity] of Object.entries(pickedCards)) {
          const checkCard = metadata.cards[code];
          if (checkCard && filter(checkCard)) {
            currentCount += quantity;
          }
        }

        limitOptions.push({ option, filter, currentCount });
      }
    }

    // Calculate available cards
    const availableCards = cardPool.filter((card) => {
      // Check deck limit
      const currentQuantity = pickedCards[card.code] ?? 0;
      const limit = cardLimit(card);
      if (currentQuantity >= limit) return false;

      // Check if adding this card would exceed any limit option
      // Only check limit options that this card matches
      for (const { option, filter } of limitOptions) {
        if (!filter) continue;

        // First check if this card matches the filter
        if (!filter(card)) {
          // Card doesn't match this limit option, skip checking this option
          continue;
        }

        // Card matches this limit option, check if adding it would exceed the limit
        // Count how many cards matching this option are already picked
        let matchCount = 0;
        for (const [code, quantity] of Object.entries(pickedCards)) {
          const checkCard = metadata.cards[code];
          if (!checkCard) continue;

          if (filter(checkCard)) {
            matchCount += quantity;
          }
        }

        // Simulate adding one copy of this card
        const newMatchCount = matchCount + 1;

        // If limit would be exceeded, exclude this card
        if (newMatchCount > (option.limit as number)) {
          return false;
        }
      }

      return true;
    });

    // Calculate debug stats
    const sampleFilteredCards: Array<{ code: string; reason: string }> = [];
    let cardsNotMatchingAnyLimit = 0;
    const limitMatchCounts: Record<number, number> = {};

    // Count how many cards match each limit option
    for (let i = 0; i < limitOptions.length; i++) {
      limitMatchCounts[i] = 0;
    }

    for (const card of cardPool.slice(0, 100)) {
      // Check deck limit
      const currentQuantity = pickedCards[card.code] ?? 0;
      const limit = cardLimit(card);
      if (currentQuantity >= limit) {
        if (sampleFilteredCards.length < 5) {
          sampleFilteredCards.push({
            code: card.code,
            reason: `deck limit reached (${currentQuantity}/${limit})`,
          });
        }
        continue;
      }

      let matchesAnyLimit = false;
      let wouldExceedLimit = false;
      let exceededLimitOption: string | undefined;

      for (let i = 0; i < limitOptions.length; i++) {
        const { option, filter } = limitOptions[i];
        if (!filter) continue;

        if (filter(card)) {
          matchesAnyLimit = true;
          limitMatchCounts[i] = (limitMatchCounts[i] ?? 0) + 1;

          // Count matches
          let matchCount = 0;
          for (const [code, quantity] of Object.entries(pickedCards)) {
            const checkCard = metadata.cards[code];
            if (checkCard && filter(checkCard)) {
              matchCount += quantity;
            }
          }

          const newMatchCount = matchCount + 1;
          if (newMatchCount > (option.limit as number)) {
            wouldExceedLimit = true;
            exceededLimitOption = `limit ${i}: ${newMatchCount} > ${option.limit} (faction: ${option.faction?.join(", ") ?? "none"})`;
            break;
          }
        }
      }

      if (!matchesAnyLimit) {
        cardsNotMatchingAnyLimit++;
      }

      if (
        wouldExceedLimit &&
        exceededLimitOption &&
        sampleFilteredCards.length < 5
      ) {
        sampleFilteredCards.push({
          code: card.code,
          reason: exceededLimitOption,
        });
      }
    }

    return {
      basePoolSize: cardPool.length,
      availableCardsSize: availableCards.length,
      limitOptions: limitOptions.map(({ option, currentCount }, idx) => ({
        id: option.id,
        limit: option.limit,
        currentCount,
        faction: option.faction,
        uses: option.uses,
        cardsMatchingInPool: limitMatchCounts[idx] ?? 0,
        // Debug: show what restrictions this option has
        restrictions: {
          hasFaction: !!option.faction,
          hasLevel: !!(option.level || option.base_level),
          hasTrait: !!option.trait,
          hasUses: !!option.uses,
          hasType: !!option.type,
          hasTag: !!option.tag,
          hasText: !!option.text,
          hasPermanent: option.permanent !== undefined,
        },
      })),
      investigatorCode,
      backCardCode,
      debugStats: {
        cardsNotMatchingAnyLimit,
        sampleFilteredCards: sampleFilteredCards.slice(0, 5),
      },
    };
  },
);

/**
 * Check if the user can start a draft with the given investigator.
 * Returns an object with canStart boolean and required/available counts.
 */
export const selectCanStartDraft = createSelector(
  [
    selectMetadata,
    selectLookupTables,
    selectLocaleSortingCollator,
    (state: StoreState, investigatorCode: string) => {
      const cardPool = state.draft?.cardPool;
      const sealed = state.draft?.sealed;
      const tabooSetId = state.draft?.tabooSetId;
      return selectDraftCardPool(
        state,
        investigatorCode,
        [],
        cardPool,
        sealed,
        tabooSetId,
        undefined,
      );
    },
    selectSignatureCards,
    (_: StoreState, investigatorCode: string) => investigatorCode,
  ],
  (
    metadata,
    _lookupTables,
    _collator,
    cardPool,
    _signatureCards,
    investigatorCode,
  ) => {
    const investigator = metadata.cards[investigatorCode];
    if (!investigator) {
      return { canStart: false, required: 0, available: 0 };
    }

    // Get the back card code - this is where deck_requirements are defined
    // For double-sided investigators, we need the back card
    const backCardCode = investigator.back_link_id ?? investigatorCode;
    const backCard = metadata.cards[backCardCode];
    if (!backCard) {
      return { canStart: false, required: 0, available: 0 };
    }

    // Get base deck size from back card's deck_requirements
    // Signatures don't count toward the draft target - they're added separately
    const targetDeckSize = backCard.deck_requirements?.size ?? 30;
    const availableCards = cardPool.length;

    return {
      canStart: availableCards >= targetDeckSize,
      required: targetDeckSize,
      available: availableCards,
    };
  },
);

/**
 * Select all customizable cards that can be legally added to the investigator's deck.
 * This includes cards not yet in the deck or cards that haven't reached their deck limit.
 * Used for generating random customization upgrade options in draft mode.
 */
export const selectLegalCustomizableCards = createSelector(
  [
    selectMetadata,
    selectLookupTables,
    (
      state: StoreState,
      investigatorCode: string,
      _pickedCards: Record<string, number>,
      additionalDeckOptions: DeckOption[],
    ) => {
      const cardPool = state.draft?.cardPool;
      const sealed = state.draft?.sealed;
      const tabooSetId = state.draft?.tabooSetId;

      // Get all legal customizable cards (level 0) regardless of XP
      // XP filtering happens in getRandomLegalCustomizationUpgrade when generating options
      return selectDraftCardPool(
        state,
        investigatorCode,
        additionalDeckOptions,
        cardPool,
        sealed,
        tabooSetId,
        undefined, // Get level 0 cards - customizable cards start at level 0
      );
    },
    (_: StoreState, investigatorCode: string) => investigatorCode,
    (
      _: StoreState,
      _investigatorCode: string,
      pickedCards: Record<string, number>,
    ) => pickedCards,
    (
      _: StoreState,
      _investigatorCode: string,
      _pickedCards: Record<string, number>,
      additionalDeckOptions: DeckOption[],
    ) => additionalDeckOptions,
  ],
  (
    metadata,
    _lookupTables,
    cardPool,
    investigatorCode,
    _pickedCards,
    _additionalDeckOptions,
  ) => {
    const investigator = metadata.cards[investigatorCode];
    if (!investigator) return [];

    // Get the back card where deck_options are defined
    const backCardCode = investigator.back_link_id ?? investigatorCode;
    const backCard = metadata.cards[backCardCode];
    if (!backCard || !backCard.deck_options) return [];

    // Filter for customizable cards only
    // Note: We don't check deck limits here - customizable cards can always appear
    // as upgrade options regardless of how many copies are in the deck.
    // Deck limit checking happens in pickDraftCustomization when adding the card.
    return cardPool.filter(
      (card) =>
        card.customization_options && card.customization_options.length > 0,
    );
  },
);
