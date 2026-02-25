import type { Card, DeckOption } from "@arkham-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import {
  cardLimit,
  countExperience,
  displayAttribute,
  isSpecialCard,
} from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { currentEnvironmentPacks } from "@/utils/environments";
import { range } from "@/utils/range";
import { shuffle } from "@/utils/shuffle";
import { applyCardChanges } from "../lib/card-edits";
import { filterInvestigatorAccess } from "../lib/filtering";
import { resolveCardWithRelations } from "../lib/resolve-card";
import { resolveDeck } from "../lib/resolve-deck";
import { selectConnectionsData } from "../selectors/connections";
import {
  selectAvailableDraftCards,
  selectLegalCustomizableCards,
  selectSignatureCards,
} from "../selectors/draft";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
  selectSettingsTabooId,
} from "../selectors/shared";
import type { Metadata } from "../slices/metadata.types";
import type { StoreState } from ".";
import type {
  CustomizationUpgradeOption,
  DraftCardSet,
  DraftOption,
  DraftSlice,
  RegularCardOption,
} from "./draft.types";

/**
 * Get a random legal customization upgrade for a card.
 * Checks each unfilled customization option to see if it would result in a card
 * level that the investigator can legally include in their deck.
 *
 * @returns An object with optionIndex and xpCost, or undefined if no valid options exist
 */
function getRandomLegalCustomizationUpgrade(
  card: Card,
  currentCustomizations: Record<number, number> | undefined,
  remainingXp: number,
  investigator: Card,
  _metadata: Metadata,
): { optionIndex: number; xpCost: number } | undefined {
  if (!card.customization_options || card.customization_options.length === 0) {
    return undefined;
  }

  // Calculate current total XP spent on this card
  let currentTotalXp = 0;
  if (currentCustomizations) {
    for (const xpSpent of Object.values(currentCustomizations)) {
      currentTotalXp += xpSpent;
    }
  }

  // Get investigator access filter with actual level checking for customizable cards
  const accessFilter = filterInvestigatorAccess(investigator, {
    customizable: {
      level: "actual",
      properties: "all",
    },
  });

  if (!accessFilter) {
    return undefined;
  }

  // Collect all valid upgrade options
  const validOptions: { optionIndex: number; xpCost: number }[] = [];

  for (
    let optionIndex = 0;
    optionIndex < card.customization_options.length;
    optionIndex++
  ) {
    const option = card.customization_options[optionIndex];

    // Skip options with no XP cost
    if (!option.xp || option.xp === 0) {
      continue;
    }

    // Check if already fully upgraded
    const currentXpSpent = currentCustomizations?.[optionIndex] ?? 0;
    if (currentXpSpent >= option.xp) {
      continue;
    }

    // Check if we have enough remaining XP
    if (option.xp > remainingXp) {
      continue;
    }

    // Calculate what the total XP would be after applying this option
    const newTotalXp = currentTotalXp + option.xp;

    // Calculate resulting card level using Math.ceil (rounds up)
    // Level = half of total checkboxes marked, rounded up
    // Note: We don't need to use this value directly, but calculating it helps
    // understand what level the card will be. The filterInvestigatorAccess
    // will check the level via customization_xp on the temporary card.
    // const newLevel = Math.ceil(newTotalXp / 2);

    // Create a temporary card with the new customization_xp to test access
    const tempCard: Card = {
      ...card,
      customization_xp: newTotalXp,
    };

    // Check if the card with this level would still be legal for the investigator
    if (accessFilter(tempCard)) {
      validOptions.push({ optionIndex, xpCost: option.xp });
    }
  }

  // If no valid options, return undefined
  if (validOptions.length === 0) {
    return undefined;
  }

  // Randomly select one of the valid options
  const randomIndex = Math.floor(Math.random() * validOptions.length);
  return validOptions[randomIndex];
}

export const createDraftSlice: StateCreator<StoreState, [], [], DraftSlice> = (
  set,
  get,
) => ({
  draft: undefined,

  initDraft(investigatorCode, initialInvestigatorChoice) {
    set((state) => {
      const metadata = selectMetadata(state);
      const settings = state.settings;

      const investigator = metadata.cards[investigatorCode];
      assert(
        investigator && investigator.type_code === "investigator",
        "Draft must be initialized with an investigator card.",
      );

      const choice = initialInvestigatorChoice
        ? metadata.cards[initialInvestigatorChoice]
        : undefined;

      if (initialInvestigatorChoice) {
        assert(
          choice && choice.type_code === "investigator",
          "Draft must be initialized with an investigator card.",
        );

        assert(
          choice.real_name === investigator.real_name,
          "Parallel investigator must have the same real name as the investigator.",
        );
      }

      const connections = selectConnectionsData(state);
      const provider = settings.defaultStorageProvider;

      // when arkhamdb is set as default storage, but not available, default to local.
      const providerExists =
        provider !== "arkhamdb" ||
        connections.some((c) => c.provider === provider);

      // Apply current environment packs if default environment is set to "current"
      // This matches deck-create behavior - manual selections will override this
      const cardPool =
        settings.defaultEnvironment === "current"
          ? currentEnvironmentPacks(Object.values(metadata.cycles))
          : undefined;

      // Determine the back card code (where deck_requirements are defined)
      const backCardCode = choice
        ? choice.code
        : (investigator.back_link_id ?? investigatorCode);
      const backCard = metadata.cards[backCardCode];
      assert(backCard, "Back card must exist for investigator.");

      // Get signature cards using the back card code
      const signatureCards = selectSignatureCards(state, backCardCode);

      const baseDeckSize = backCard.deck_requirements?.size ?? 30;

      return {
        draft: {
          phase: "setup",
          investigatorCode,
          investigatorFrontCode: choice ? choice.code : investigator.code,
          investigatorBackCode: backCardCode,
          cardsPerPick: 5,
          pickedCards: {},
          signatureCards,
          currentOptions: [],
          targetDeckSize: baseDeckSize,
          tabooSetId: selectSettingsTabooId(settings, metadata),
          provider: providerExists ? provider : "local",
          title: `${displayAttribute(investigator, "name")} Draft`,
          selections: {},
          sets: ["requiredCards"],
          cardPool,
          mode: "new",
          remainingXp: 0,
          totalXp: 0,
          customizationUpgrades: {},
          skipsAllowed: 0,
          skipsUsed: 0,
          researchedCards: [],
        },
      };
    });
  },

  initUpgradeDraft(
    deckId,
    newXp,
    cardsPerPick,
    previousRemainingXp = 0,
    totalAvailableXp?: number,
  ) {
    set((state) => {
      const metadata = selectMetadata(state);
      const lookupTables = selectLookupTables(state);
      const collator = selectLocaleSortingCollator(state);

      const deck = state.data.decks[deckId];
      assert(deck, `Deck ${deckId} does not exist.`);

      // Resolve the deck to get investigator info
      const resolved = resolveDeck(
        {
          lookupTables,
          metadata,
          sharing: state.sharing,
        },
        collator,
        deck,
      );

      const investigator = resolved.investigatorFront.card;
      assert(
        investigator && investigator.type_code === "investigator",
        "Deck must have an investigator.",
      );

      // Use the base investigator code from the deck (not the resolved front card)
      const investigatorCode = deck.investigator_code;

      // Use the resolved front/back codes which already account for parallel selections
      const investigatorFrontCode = resolved.investigatorFront.card.code;
      const investigatorBackCode = resolved.investigatorBack.card.code;

      const backCard = metadata.cards[investigatorBackCode];
      assert(backCard, "Back card must exist for investigator.");

      // Get signature cards using the back card code (which may be parallel)
      const signatureCards = selectSignatureCards(state, investigatorBackCode);

      // Copy existing deck slots to pickedCards (excluding signatures)
      const pickedCards: Record<string, number> = {};
      for (const [code, quantity] of Object.entries(deck.slots)) {
        // Don't include signature cards in pickedCards
        if (!signatureCards[code]) {
          pickedCards[code] = quantity;
        }
      }

      const settings = state.settings;

      const connections = selectConnectionsData(state);
      const provider = settings.defaultStorageProvider;

      const providerExists =
        provider !== "arkhamdb" ||
        connections.some((c) => c.provider === provider);

      // Use card pool from the original deck if set, otherwise use default environment
      const cardPool = resolved.cardPool
        ? resolved.cardPool
        : settings.defaultEnvironment === "current"
          ? currentEnvironmentPacks(Object.values(metadata.cycles))
          : undefined;

      // Convert Selections (Record<string, Selection>) to draft format (Record<string, string>)
      const draftSelections: Record<string, string> = {};
      if (resolved.selections) {
        for (const [key, selection] of Object.entries(resolved.selections)) {
          if (selection.type === "deckSize") {
            draftSelections[key] = String(selection.value);
          } else if (selection.type === "faction") {
            if (selection.value) {
              draftSelections[key] = selection.value;
            }
          } else if (selection.type === "option") {
            if (selection.value?.id) {
              draftSelections[key] = selection.value.id;
            }
          }
        }
      }

      // Initialize customizationUpgrades from the resolved deck's customizations
      const customizationUpgrades: Record<string, Record<number, number>> = {};
      if (resolved.customizations) {
        for (const [cardCode, customizations] of Object.entries(
          resolved.customizations,
        )) {
          customizationUpgrades[cardCode] = {};
          for (const [indexStr, customization] of Object.entries(
            customizations,
          )) {
            const index = Number.parseInt(indexStr, 10);
            customizationUpgrades[cardCode][index] = customization.xp_spent;
          }
        }
      }

      return {
        draft: {
          phase: "picking",
          investigatorCode,
          investigatorFrontCode,
          investigatorBackCode,
          cardsPerPick,
          pickedCards,
          signatureCards,
          currentOptions: [],
          targetDeckSize: 0, // Not used in upgrade mode
          tabooSetId: deck.taboo_id ?? undefined,
          provider: providerExists ? provider : "local",
          title: deck.name,
          selections: draftSelections,
          sets: ["requiredCards"],
          cardPool,
          sealed: resolved.sealedDeck,
          mode: "upgrade",
          upgradeDeckId: deckId,
          remainingXp: totalAvailableXp ?? newXp + previousRemainingXp, // Use total available for card pool filtering
          totalXp: newXp, // Only NEW XP (will be passed to upgradeDeck)
          previousRemainingXp, // Store old deck's remaining XP separately
          exileString: undefined,
          customizationUpgrades,
          skipsAllowed: 0,
          skipsUsed: 0,
          researchedCards: [],
        },
      };
    });

    // Generate initial options after initialization
    get().generateDraftOptions();
  },

  startDraft() {
    const state = get();
    assert(state.draft, "Draft must be initialized before starting.");

    const draft = state.draft;
    const metadata = selectMetadata(state);
    const lookupTables = selectLookupTables(state);
    const collator = selectLocaleSortingCollator(state);
    const backCardCode = draft.investigatorBackCode;

    // Recalculate signature cards based on selected sets
    const backCardWithRelations = resolveCardWithRelations(
      { metadata, lookupTables },
      collator,
      backCardCode,
      draft.tabooSetId,
      undefined,
      true,
    );

    const signatureCards: Record<string, number> = {};
    const relations = backCardWithRelations?.relations;

    // Add requiredCards if selected
    if (draft.sets.includes("requiredCards") && relations?.requiredCards) {
      for (const { card } of relations.requiredCards) {
        let quantity = card.quantity ?? 1;
        if (card.code === SPECIAL_CARD_CODES.OCCULT_EVIDENCE) {
          const backCard = metadata.cards[backCardCode];
          const baseDeckSize = backCard?.deck_requirements?.size ?? 30;
          quantity = Math.max(1, Math.floor((baseDeckSize - 20) / 10));
        }
        signatureCards[card.code] = quantity;
      }
    }

    // Add advanced if selected (mutually exclusive with requiredCards)
    if (draft.sets.includes("advanced") && relations?.advanced) {
      for (const { card } of relations.advanced) {
        signatureCards[card.code] = card.quantity ?? 1;
      }
    }

    // Add replacement if selected
    if (draft.sets.includes("replacement") && relations?.replacement) {
      for (const { card } of relations.replacement) {
        signatureCards[card.code] = card.quantity ?? 1;
      }
    }

    // Always add random basic weakness
    const backCard = metadata.cards[backCardCode];
    const randomWeaknessCount =
      backCard?.deck_requirements?.random?.length ?? 1;
    signatureCards[SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS] =
      randomWeaknessCount;

    set({
      draft: {
        ...draft,
        phase: "picking",
        signatureCards,
      },
    });

    // Generate initial options
    get().generateDraftOptions();
  },

  generateDraftOptions() {
    const state = get();
    assert(state.draft, "Draft must be initialized.");

    const { draft } = state;
    const { pickedCards, cardsPerPick, investigatorBackCode } = draft;

    // Use investigatorBackCode for card pool selection since deck building rules are on the back card
    const metadata = selectMetadata(state);
    const backCard = metadata.cards[investigatorBackCode];
    const baseDeckSize = backCard?.deck_requirements?.size ?? 30;

    // Collect additional deck options from picked cards (like getAdditionalDeckOptions)
    const additionalDeckOptions: DeckOption[] = [];
    for (const [code, quantity] of Object.entries(pickedCards)) {
      const card = metadata.cards[code];
      if (card && card.type_code !== "investigator" && card.deck_options) {
        for (const _ of range(0, quantity)) {
          additionalDeckOptions.push(...card.deck_options);
        }
      }
    }

    // For upgrade mode, check remaining XP instead of deck size
    if (draft.mode === "upgrade") {
      if (draft.remainingXp <= 0) {
        set({
          draft: {
            ...draft,
            phase: "complete",
            currentOptions: [],
          },
        });
        return;
      }

      // Get available cards (filtered by XP range and faction limits)
      const availableCards = selectAvailableDraftCards(
        state,
        investigatorBackCode,
        pickedCards,
        additionalDeckOptions,
      );

      // Collect customizable upgrade options
      const customizationOptions: CustomizationUpgradeOption[] = [];
      const customizationUpgrades = draft.customizationUpgrades ?? {};

      // NEW: Get all legal customizable cards for this investigator
      const legalCustomizableCards = selectLegalCustomizableCards(
        state,
        investigatorBackCode,
        pickedCards,
        additionalDeckOptions,
      );

      // For each legal customizable card, try to generate a random upgrade
      for (const card of legalCustomizableCards) {
        const currentCustomizations = customizationUpgrades[card.code];
        const randomUpgrade = getRandomLegalCustomizationUpgrade(
          card,
          currentCustomizations,
          draft.remainingXp,
          backCard,
          metadata,
        );

        if (randomUpgrade) {
          customizationOptions.push({
            type: "customization",
            cardCode: card.code,
            optionIndex: randomUpgrade.optionIndex,
            xpCost: randomUpgrade.xpCost,
          });
        }
      }

      // Combine regular cards and customization options
      const allOptions: DraftOption[] = [
        ...availableCards.map(
          (card): RegularCardOption => ({
            type: "card",
            code: card.code,
          }),
        ),
        ...customizationOptions,
      ];

      // If no options available (remaining XP too low), complete the draft
      if (allOptions.length === 0) {
        set({
          draft: {
            ...draft,
            phase: "complete",
            currentOptions: [],
          },
        });
        return;
      }

      // Shuffle and take the required number of options
      const shuffled = shuffle([...allOptions]);
      const options = shuffled.slice(0, cardsPerPick);

      set({
        draft: {
          ...draft,
          currentOptions: options,
        },
      });
      return;
    }

    // Original logic for new draft mode
    // Calculate deck size adjustment from picked cards
    let deckSizeAdjustment = 0;
    for (const [code, quantity] of Object.entries(pickedCards)) {
      const card = metadata.cards[code];
      if (card?.deck_requirements?.size != null) {
        deckSizeAdjustment += card.deck_requirements.size * quantity;
      }
    }

    const targetDeckSize = baseDeckSize + deckSizeAdjustment;

    // Calculate current deck size excluding special cards (signatures, weaknesses, etc.)
    // Same logic as decodeSlots in slots.ts
    let currentDeckSize = 0;
    for (const [code, quantity] of Object.entries(pickedCards)) {
      const card = metadata.cards[code];
      if (card && !isSpecialCard(card)) {
        currentDeckSize += quantity;
      }
    }

    if (currentDeckSize >= targetDeckSize) {
      set({
        draft: {
          ...draft,
          phase: "complete",
          currentOptions: [],
          targetDeckSize,
        },
      });
      return;
    }

    // Get available cards (filtered by faction limits and deck limits)
    // Include additional deck options from picked cards
    // Use investigatorBackCode since deck building rules are on the back card
    // Note: selector expects 5 args: state, cardPoolFromState (extracted internally), investigatorCode, pickedCards, additionalDeckOptions
    // But reselect handles the internal extraction, so we pass: state, investigatorCode, pickedCards, additionalDeckOptions
    const availableCards = selectAvailableDraftCards(
      state,
      investigatorBackCode,
      pickedCards,
      additionalDeckOptions,
    );

    // Shuffle and take the required number of options
    const shuffled = shuffle([...availableCards]);
    const options: DraftOption[] = shuffled.slice(0, cardsPerPick).map(
      (card): RegularCardOption => ({
        type: "card",
        code: card.code,
      }),
    );

    set({
      draft: {
        ...draft,
        currentOptions: options,
        targetDeckSize,
      },
    });
  },

  pickDraftCard(code, quantity = 1) {
    const state = get();
    assert(state.draft, "Draft must be initialized.");

    const { draft } = state;
    const metadata = selectMetadata(state);
    let card = metadata.cards[code];
    assert(card, `Card ${code} must exist.`);

    // Apply taboo changes before calculating XP cost
    if (draft.tabooSetId) {
      card = applyCardChanges(card, metadata, draft.tabooSetId, undefined);
    }

    const currentQuantity = draft.pickedCards[code] ?? 0;
    const newQuantity = currentQuantity + quantity;

    // For upgrade mode, deduct XP cost
    // For Myriad cards, only the first copy costs XP
    let remainingXp = draft.remainingXp;
    if (draft.mode === "upgrade") {
      const xpCost = countExperience(card, quantity);
      remainingXp = Math.max(0, draft.remainingXp - xpCost);
    }

    set({
      draft: {
        ...draft,
        pickedCards: {
          ...draft.pickedCards,
          [code]: newQuantity,
        },
        remainingXp,
      },
    });

    // Generate new options after picking
    get().generateDraftOptions();
  },

  pickDraftCustomization(cardCode, optionIndex) {
    const state = get();
    assert(state.draft, "Draft must be initialized.");

    const { draft } = state;
    const metadata = selectMetadata(state);
    const card = metadata.cards[cardCode];
    assert(card, `Card ${cardCode} must exist.`);
    assert(
      card.customization_options,
      `Card ${cardCode} must have customization options.`,
    );
    assert(
      optionIndex >= 0 && optionIndex < card.customization_options.length,
      `Invalid option index ${optionIndex} for card ${cardCode}.`,
    );

    const option = card.customization_options[optionIndex];
    assert(
      option.xp,
      `Option ${optionIndex} for card ${cardCode} has no XP cost.`,
    );

    // Check if we have enough XP
    if (option.xp > draft.remainingXp) {
      return; // Not enough XP, don't allow the pick
    }

    // Always try to add a copy of the card to the deck (if not at deck limit)
    const currentQuantity = draft.pickedCards[cardCode] ?? 0;
    const deckLimit = cardLimit(card);

    // Create a new pickedCards object to ensure Zustand detects the change
    const updatedPickedCards = { ...draft.pickedCards };

    // Add one copy of the card if under deck limit
    // This ensures the card is added to the deck when picking its upgrade
    if (currentQuantity < deckLimit) {
      updatedPickedCards[cardCode] = currentQuantity + 1;
    }
    // Note: If already at deck limit, the upgrade is still applied to existing copies
    // We still create a new object reference to ensure state updates are detected

    // Update customization upgrades
    const customizationUpgrades = { ...(draft.customizationUpgrades ?? {}) };
    if (!customizationUpgrades[cardCode]) {
      customizationUpgrades[cardCode] = {};
    }
    customizationUpgrades[cardCode] = {
      ...customizationUpgrades[cardCode],
      [optionIndex]: option.xp, // Mark as fully upgraded
    };

    // Deduct XP cost
    const remainingXp = Math.max(0, draft.remainingXp - option.xp);

    set({
      draft: {
        ...draft,
        pickedCards: updatedPickedCards,
        customizationUpgrades,
        remainingXp,
      },
    });

    // Generate new options after picking
    get().generateDraftOptions();
  },

  resetDraft() {
    set({ draft: undefined });
  },

  draftSetTitle(value: string) {
    set((state) => {
      assert(state.draft, "Draft must be initialized.");
      return {
        draft: {
          ...state.draft,
          title: value,
        },
      };
    });
  },

  draftSetTabooSet(value: number | undefined) {
    set((state) => {
      assert(state.draft, "Draft must be initialized.");
      return {
        draft: {
          ...state.draft,
          tabooSetId: value,
        },
      };
    });
  },

  draftSetProvider(value) {
    set((state) => {
      assert(state.draft, "Draft must be initialized.");
      return {
        draft: {
          ...state.draft,
          provider: value,
        },
      };
    });
  },

  draftSetInvestigatorCode(value: string, side?: "front" | "back") {
    set((state) => {
      assert(state.draft, "Draft must be initialized.");

      if (!side) {
        return {
          draft: {
            ...state.draft,
            investigatorCode: value,
            investigatorFrontCode: value,
            investigatorBackCode: value,
            // Regenerate signature cards when back changes
            signatureCards: selectSignatureCards(state, value),
          },
        };
      }

      const path =
        side === "front" ? "investigatorFrontCode" : "investigatorBackCode";

      const updatedDraft = {
        ...state.draft,
        [path]: value,
      };

      // If back changed, regenerate signature cards and reset picked cards
      if (side === "back") {
        const metadata = selectMetadata(state);
        const backCard = metadata.cards[value];
        const baseDeckSize = backCard?.deck_requirements?.size ?? 30;

        return {
          draft: {
            ...updatedDraft,
            signatureCards: selectSignatureCards(state, value),
            targetDeckSize: baseDeckSize,
            // Reset picked cards since card pool changed
            pickedCards: {},
            currentOptions: [],
          },
        };
      }

      return {
        draft: updatedDraft,
      };
    });
  },

  draftSetSelection(key, value) {
    set((state) => {
      assert(state.draft, "Draft must be initialized.");
      return {
        draft: {
          ...state.draft,
          selections: {
            ...state.draft.selections,
            [key]: value,
          },
        },
      };
    });
  },

  draftSetCardPool(value) {
    set((state) => {
      assert(state.draft, "Draft must be initialized.");
      // When user manually sets card pool, it overrides default environment
      // Empty array [] means "no card pool filter" (all cards available) - set to null to distinguish from undefined
      // Array with items means filter to those packs
      // undefined means "use default environment from settings" (if set during init)
      return {
        draft: {
          ...state.draft,
          cardPool: value.length === 0 ? null : value,
        },
      };
    });
  },

  draftSetSealed(sealed) {
    set((state) => {
      assert(state.draft, "Draft must be initialized.");
      return {
        draft: {
          ...state.draft,
          sealed,
        },
      };
    });
  },

  draftSetCardsPerPick(value) {
    set((state) => {
      assert(state.draft, "Draft must be initialized.");
      return {
        draft: {
          ...state.draft,
          cardsPerPick: value,
        },
      };
    });
  },

  draftToggleCardSet(value) {
    set((state) => {
      assert(state.draft, "Draft must be initialized.");
      const draft = state.draft;

      // Validate the card set value
      const validSets: DraftCardSet[] = [
        "requiredCards",
        "advanced",
        "replacement",
      ];
      if (!validSets.includes(value as DraftCardSet)) {
        return state;
      }

      const nextSets: DraftCardSet[] = draft.sets.filter((set) => {
        // Handle mutually exclusive sets: advanced and requiredCards
        const mutuallyExclusive =
          (set === "advanced" && value === "requiredCards") ||
          (set === "requiredCards" && value === "advanced");

        return !mutuallyExclusive;
      });

      const newSets = nextSets.includes(value as DraftCardSet)
        ? nextSets.filter((set) => set !== value)
        : [...nextSets, value as DraftCardSet];

      // Recalculate signature cards based on selected sets
      const metadata = selectMetadata(state);
      const lookupTables = selectLookupTables(state);
      const collator = selectLocaleSortingCollator(state);
      const backCardCode = draft.investigatorBackCode;

      // Get investigator with relations
      const backCardWithRelations = resolveCardWithRelations(
        { metadata, lookupTables },
        collator,
        backCardCode,
        draft.tabooSetId,
        undefined,
        true,
      );

      const signatureCards: Record<string, number> = {};
      const relations = backCardWithRelations?.relations;

      // Add requiredCards if selected
      if (newSets.includes("requiredCards") && relations?.requiredCards) {
        for (const { card } of relations.requiredCards) {
          let quantity = card.quantity ?? 1;
          if (card.code === SPECIAL_CARD_CODES.OCCULT_EVIDENCE) {
            const backCard = metadata.cards[backCardCode];
            const baseDeckSize = backCard?.deck_requirements?.size ?? 30;
            quantity = Math.max(1, Math.floor((baseDeckSize - 20) / 10));
          }
          signatureCards[card.code] = quantity;
        }
      }

      // Add advanced if selected (mutually exclusive with requiredCards)
      if (newSets.includes("advanced") && relations?.advanced) {
        for (const { card } of relations.advanced) {
          signatureCards[card.code] = card.quantity ?? 1;
        }
      }

      // Add replacement if selected
      if (newSets.includes("replacement") && relations?.replacement) {
        for (const { card } of relations.replacement) {
          signatureCards[card.code] = card.quantity ?? 1;
        }
      }

      // Always add random basic weakness
      const backCard = metadata.cards[backCardCode];
      const randomWeaknessCount =
        backCard?.deck_requirements?.random?.length ?? 1;
      signatureCards[SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS] =
        randomWeaknessCount;

      return {
        draft: {
          ...draft,
          sets: newSets,
          signatureCards,
        },
      };
    });
  },

  draftSetSkipsAllowed(value) {
    set((state) => {
      assert(state.draft, "Draft must be initialized.");
      return {
        draft: {
          ...state.draft,
          skipsAllowed: value,
        },
      };
    });
  },

  draftSetResearchedCards(cards) {
    set((state) => {
      assert(state.draft, "Draft must be initialized.");
      return {
        draft: {
          ...state.draft,
          researchedCards: cards,
        },
      };
    });
  },

  skipDraftStep() {
    const state = get();
    assert(state.draft, "Draft must be initialized.");
    const draft = state.draft;

    // Check if skips are available
    if (draft.skipsUsed >= draft.skipsAllowed) {
      return;
    }

    // Increment skips used and generate new options
    set({
      draft: {
        ...draft,
        skipsUsed: draft.skipsUsed + 1,
      },
    });

    // Generate new options (skip the current ones)
    get().generateDraftOptions();
  },
});
