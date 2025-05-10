import { assert } from "@/utils/assert";
import { displayAttribute, getCanonicalCardCode } from "@/utils/card-utils";
import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import { getDefaultDeckName } from "../lib/deck-factory";
import { selectMetadata } from "../selectors/shared";
import type { CardSet, DeckCreateSlice } from "./deck-create.types";

export const createDeckCreateSlice: StateCreator<
  StoreState,
  [],
  [],
  DeckCreateSlice
> = (set, get) => ({
  deckCreate: undefined,

  initCreate(code: string, initialInvestigatorChoice?: string) {
    const state = get();
    const metadata = selectMetadata(state);

    const investigator = metadata.cards[code];

    assert(
      investigator && investigator.type_code === "investigator",
      "Deck configure must be initialized with an investigator card.",
    );

    const canonicalCode = getCanonicalCardCode(investigator);

    const choice = initialInvestigatorChoice
      ? metadata.cards[initialInvestigatorChoice]
      : undefined;

    if (initialInvestigatorChoice) {
      assert(
        choice && choice.type_code === "investigator",
        "Deck configure must be initialized with an investigator card.",
      );

      assert(
        choice.real_name === investigator.real_name,
        "Parallel investigator must have the same real name as the investigator.",
      );
    }

    set({
      deckCreate: {
        extraCardQuantities: {},
        investigatorBackCode: choice ? choice.code : canonicalCode,
        investigatorCode: canonicalCode,
        investigatorFrontCode: choice ? choice.code : canonicalCode,
        provider: "",
        selections: {},
        sets: ["requiredCards"],
        tabooSetId: state.settings.tabooSetId ?? undefined,
        title: getDefaultDeckName(
          displayAttribute(investigator, "name"),
          investigator.faction_code,
        ),
      },
    });
  },

  resetCreate() {
    set({
      deckCreate: undefined,
    });
  },

  deckCreateSetTitle(value: string) {
    const state = get();
    assert(state.deckCreate, "DeckCreate slice must be initialized.");

    set({
      deckCreate: {
        ...state.deckCreate,
        title: value,
      },
    });
  },

  deckCreateSetTabooSet(value: number | undefined) {
    const state = get();
    assert(state.deckCreate, "DeckCreate slice must be initialized.");

    set({
      deckCreate: {
        ...state.deckCreate,
        tabooSetId: value,
      },
    });
  },

  deckCreateSetInvestigatorCode(value: string, side?: "front" | "back") {
    const state = get();

    assert(state.deckCreate, "DeckCreate slice must be initialized.");

    if (!side) {
      set({
        deckCreate: {
          ...state.deckCreate,
          investigatorCode: value,
          investigatorFrontCode: value,
          investigatorBackCode: value,
        },
      });
      return;
    }

    const path =
      side === "front" ? "investigatorFrontCode" : "investigatorBackCode";

    set({
      deckCreate: {
        ...state.deckCreate,
        [path]: value,
      },
    });
  },

  deckCreateSetSelection(key, value) {
    const state = get();
    assert(state.deckCreate, "DeckCreate slice must be initialized.");

    set({
      deckCreate: {
        ...state.deckCreate,
        selections: {
          ...state.deckCreate.selections,
          [key]: value,
        },
      },
    });
  },

  deckCreateToggleCardSet(value) {
    set((state) => {
      assert(state.deckCreate, "DeckCreate slice must be initialized.");
      assert(isCardSet(value), "Invalid card set value.");

      const nextSets: CardSet[] = state.deckCreate.sets.filter((set) => {
        const mutuallyExclusive =
          (set === "advanced" && value === "requiredCards") ||
          (set === "requiredCards" && value === "advanced");

        return !mutuallyExclusive;
      });

      return {
        deckCreate: {
          ...state.deckCreate,
          sets: nextSets.includes(value)
            ? nextSets.filter((set) => set !== value)
            : [...nextSets, value],
        },
      };
    });
  },

  deckCreateChangeExtraCardQuantity(card, quantity) {
    const state = get();
    assert(state.deckCreate, "DeckCreate slice must be initialized.");

    const currentQuantity =
      state.deckCreate.extraCardQuantities[card.code] ?? card.quantity;

    set({
      deckCreate: {
        ...state.deckCreate,
        extraCardQuantities: {
          ...state.deckCreate.extraCardQuantities,
          [card.code]: currentQuantity + quantity,
        },
      },
    });
  },
  deckCreateSetCardPool(value) {
    const state = get();
    assert(state.deckCreate, "DeckCreate slice must be initialized.");

    set({
      deckCreate: {
        ...state.deckCreate,
        cardPool: value,
      },
    });
  },
  deckCreateSetSealed(sealed) {
    const state = get();
    assert(state.deckCreate, "DeckCreate slice must be initialized.");
    set({
      deckCreate: {
        ...state.deckCreate,
        sealed,
      },
    });
  },
  deckCreateSetProvider(provider) {
    const state = get();
    assert(state.deckCreate, "DeckCreate slice must be initialized.");
    set({
      deckCreate: {
        ...state.deckCreate,
        provider,
      },
    });
  },
});

function isCardSet(value: string): value is CardSet {
  return (
    value === "requiredCards" || value === "advanced" || value === "replacement"
  );
}
