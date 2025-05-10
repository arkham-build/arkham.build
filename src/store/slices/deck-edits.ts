import { assert } from "@/utils/assert";
import { cardLimit, displayAttribute } from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { capitalize } from "@/utils/formatting";
import { range } from "@/utils/range";
import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import { clampAttachmentQuantity } from "../lib/attachments";
import { randomBasicWeaknessForDeck } from "../lib/random-basic-weakness";
import { getDeckLimitOverride } from "../lib/resolve-deck";
import { selectResolvedDeckById } from "../selectors/decks";
import { selectLookupTables, selectMetadata } from "../selectors/shared";
import type { Id } from "./data.types";
import { type DeckEditsSlice, mapTabToSlot } from "./deck-edits.types";

function currentEdits(state: StoreState, deckId: Id) {
  return state.deckEdits[deckId] ?? {};
}

export const createDeckEditsSlice: StateCreator<
  StoreState,
  [],
  [],
  DeckEditsSlice
> = (set, get) => ({
  deckEdits: {},

  discardEdits(deckId) {
    const state = get();
    const deckEdits = { ...state.deckEdits };
    delete deckEdits[deckId];
    set({ deckEdits });
    state.dehydrate("edits").catch(console.error);
  },

  updateCardQuantity(deckId, code, quantity, limit, tab, mode = "increment") {
    const state = get();

    const edits = currentEdits(state, deckId);

    const targetTab = tab || "slots";
    const slot = mapTabToSlot(targetTab);

    const deck = selectResolvedDeckById(state, deckId, true);
    assert(deck, `Tried to edit deck that does not exist: ${deckId}`);

    const current = deck[slot]?.[code] ?? 0;

    const newValue =
      mode === "increment"
        ? Math.min(Math.max(current + quantity, 0), limit)
        : Math.max(Math.min(quantity, limit), 0);

    const nextState: Partial<StoreState> = {
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...edits,
          quantities: {
            ...edits.quantities,
            [slot]: {
              ...edits.quantities?.[slot],
              [code]: newValue,
            },
          },
        },
      },
    };

    // ensure quantity of attachments is less than quantity in deck.
    if (targetTab === "slots" && nextState.deckEdits && deck.attachments) {
      nextState.deckEdits[deckId].attachments = clampAttachmentQuantity(
        edits.attachments,
        deck.attachments,
        code,
        newValue,
      );
    }

    // remove recommendation core card entry after card is remove from deck.
    if (
      targetTab === "slots" &&
      newValue === 0 &&
      state.recommender?.coreCards[deckId]?.includes(code)
    ) {
      nextState.recommender = {
        ...state.recommender,
        coreCards: {
          ...state.recommender.coreCards,
          [deckId]: state.recommender.coreCards[deckId].filter(
            (c) => c !== code,
          ),
        },
      };
    }

    set(nextState);

    state.dehydrate("edits").catch(console.error);
  },
  updateTabooId(deckId, value) {
    const state = get();

    set({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          tabooId: value,
        },
      },
    });

    state.dehydrate("edits").catch(console.error);
  },
  updateDescription(deckId, value) {
    const state = get();

    set({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          description_md: value,
        },
      },
    });

    state.dehydrate("edits").catch(console.error);
  },
  updateName(deckId, value) {
    const state = get();

    set({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          name: value,
        },
      },
    });

    state.dehydrate("edits").catch(console.error);
  },
  updateMetaProperty(deckId, key, value) {
    const state = get();
    const edits = currentEdits(state, deckId);

    set({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...edits,
          meta: {
            ...edits.meta,
            [key]: value || null,
          },
        },
      },
    });

    state.dehydrate("edits").catch(console.error);
  },
  updateInvestigatorSide(deckId, side, code) {
    const state = get();

    set({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          [`investigator${capitalize(side)}`]: code,
        },
      },
    });

    state.dehydrate("edits").catch(console.error);
  },
  updateCustomization(deckId, code, index, patch) {
    const state = get();
    const edits = currentEdits(state, deckId);

    set({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...edits,
          customizations: {
            ...edits.customizations,
            [code]: {
              ...edits.customizations?.[code],
              [index]: {
                ...edits.customizations?.[code]?.[index],
                ...patch,
              },
            },
          },
        },
      },
    });

    state.dehydrate("edits").catch(console.error);
  },
  updateTags(deckId, value) {
    const state = get();

    set({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          tags: value,
        },
      },
    });

    state.dehydrate("edits").catch(console.error);
  },
  updateXpAdjustment(deckId, value) {
    const state = get();

    set({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          xpAdjustment: value,
        },
      },
    });

    state.dehydrate("edits").catch(console.error);
  },
  drawRandomBasicWeakness(deckId) {
    const state = get();
    const metadata = selectMetadata(state);

    const resolvedDeck = selectResolvedDeckById(state, deckId, true);

    assert(
      resolvedDeck,
      "Tried to draw a random basic weakness for a deck that does not exist.",
    );

    const weakness = randomBasicWeaknessForDeck(
      metadata,
      selectLookupTables(state),
      state.settings,
      resolvedDeck,
    );

    assert(weakness, "Could not find a random basic weakness to draw.");

    const rbwQuantity =
      resolvedDeck.slots[SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS] ?? 0;
    const weaknessQuantity = resolvedDeck.slots[weakness] ?? 0;

    const edits = currentEdits(state, deckId);

    set({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...edits,
          quantities: {
            ...edits.quantities,
            slots: {
              ...edits.quantities?.slots,
              [SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS]: Math.max(
                rbwQuantity - 1,
                0,
              ),
              [weakness]: weaknessQuantity + 1,
            },
          },
        },
      },
    });

    state.dehydrate("edits").catch(console.error);

    return metadata.cards[weakness];
  },
  updateAttachment({ deck, targetCode, code, quantity, limit }) {
    const attachments = get().deckEdits[deck.id]?.attachments ?? {};

    attachments[targetCode] ??= {};
    attachments[targetCode][code] = quantity;

    const availableQuantity = Math.max(limit - quantity, 0);

    for (const [key, entries] of Object.entries(attachments)) {
      if (key === targetCode) continue;

      for (const [other, quantity] of Object.entries(entries)) {
        if (code !== other) continue;
        attachments[key][other] = Math.min(availableQuantity, quantity);
      }
    }

    set((state) => ({
      deckEdits: {
        ...state.deckEdits,
        [deck.id]: {
          ...state.deckEdits[deck.id],
          attachments,
        },
      },
    }));

    get().dehydrate("edits").catch(console.error);
  },

  swapDeck(card, deckId, target) {
    const state = get();

    const source = target === "slots" ? "sideSlots" : "slots";
    const deck = selectResolvedDeckById(state, deckId, true);

    const quantity = deck?.[source]?.[card.code] ?? 0;
    if (!quantity) return;

    const edits = currentEdits(state, deckId);

    const limitOverride = getDeckLimitOverride(
      selectLookupTables(state),
      deck,
      card,
    );

    const targetQuantity = Math.min(
      (deck?.[target]?.[card.code] ?? 0) + 1,
      cardLimit(card, limitOverride),
    );

    const sourceQuantity = Math.max((deck?.[source]?.[card.code] ?? 0) - 1, 0);

    set({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...edits,
          quantities: {
            ...edits.quantities,
            [source]: {
              ...edits.quantities?.[source],
              [card.code]: sourceQuantity,
            },
            [target]: {
              ...currentEdits(state, deckId).quantities?.[target],
              [card.code]: targetQuantity,
            },
          },
        },
      },
    });

    state.dehydrate("edits").catch(console.error);
  },
  updateAnnotation(deckId, code, value) {
    const state = get();
    const edits = currentEdits(state, deckId);

    set({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...edits,
          annotations: {
            ...edits.annotations,
            [code]: value,
          },
        },
      },
    });

    state.dehydrate("edits").catch(console.error);
  },

  upgradeCard({ deckId, availableUpgrades, code, upgradeCode, delta, slots }) {
    const state = get();
    const metadata = selectMetadata(state);

    const deck = selectResolvedDeckById(state, deckId, true);
    assert(deck, `Tried to edit deck that does not exist: ${deckId}`);

    state.updateCardQuantity(
      deckId,
      upgradeCode,
      delta,
      cardLimit(metadata.cards[upgradeCode]),
      slots,
    );

    const shouldUpdateSourceQuantity =
      availableUpgrades.upgrades[code].reduce((acc, curr) => {
        return acc + (deck[slots]?.[curr.code] ?? 0);
      }, 0) <= cardLimit(metadata.cards[code]);

    if (shouldUpdateSourceQuantity) {
      state.updateCardQuantity(
        deckId,
        code,
        delta * -1,
        cardLimit(metadata.cards[code]),
        slots,
      );
    }
  },
  applyShrewdAnalysis({ availableUpgrades, code, deckId, slots }) {
    const state = get();
    const metadata = selectMetadata(state);

    const upgrades = availableUpgrades.upgrades[code];
    assert(upgrades.length, "No upgrades available for card");

    const quantity = cardLimit(upgrades[0]);

    const randomUpgrades = range(0, quantity).map(() => {
      return upgrades[Math.floor(Math.random() * upgrades.length)];
    });

    // TODO: this updates the store five times, which in turn writes to storage 5 times (and sends to other tabs).
    //       it would be good to do this in one "transaction".

    for (const upgrade of randomUpgrades) {
      state.upgradeCard({
        availableUpgrades,
        code,
        deckId,
        delta: 1,
        slots,
        upgradeCode: upgrade.code,
      });
    }

    const sourceCard = metadata.cards[code];

    state.updateXpAdjustment(
      deckId,
      (upgrades[0].xp ?? 0) - (sourceCard.xp ?? 0),
    );
  },
  completeTask(deckId, card) {
    const state = get();

    assert(
      card.real_traits?.includes("Task"),
      `${displayAttribute(card, "name")} is not a Task.`,
    );

    const completeId = card.back_link_id ?? `${card.code.slice(0, -1)}b`;

    state.updateCardQuantity(deckId, card.code, 0, 1, "slots", "set");
    state.updateCardQuantity(deckId, completeId, 1, 1, "slots", "set");

    state.dehydrate("edits").catch(console.error);

    return completeId;
  },
});
