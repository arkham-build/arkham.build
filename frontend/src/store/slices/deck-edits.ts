import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { cardLimit, displayAttribute } from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { capitalize } from "@/utils/formatting";
import { range } from "@/utils/range";
import { clampAttachmentQuantity } from "../lib/attachments";
import { randomBasicWeaknessForDeck } from "../lib/random-basic-weakness";
import { getDeckLimitOverride } from "../lib/resolve-deck";
import { dehydrate } from "../persist";
import type { Id } from "../schemas/deck.schema";
import { selectResolvedDeckById } from "../selectors/decks";
import { selectLookupTables, selectMetadata } from "../selectors/shared";
import type { StoreState } from ".";
import {
  type DeckEditsSlice,
  mapTabToSlot,
  type Slot,
  type UpgradePayload,
} from "./deck-edits.types";

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

  createEdit(deckId, edit) {
    set((state) => {
      return {
        deckEdits: {
          ...state.deckEdits,
          [deckId]: edit,
        },
      };
    });

    dehydrate(get(), "edits").catch(console.error);
  },

  discardEdits(deckId) {
    set((state) => {
      const deckEdits = { ...state.deckEdits };
      delete deckEdits[deckId];
      return { deckEdits };
    });
    dehydrate(get(), "edits").catch(console.error);
  },
  updateInvestigatorCode(deckId, code) {
    set((state) => ({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          investigatorCode: code,
          type: "user" as const,
        },
      },
    }));

    dehydrate(get(), "edits").catch(console.error);
  },
  updateCardQuantity(deckId, code, quantity, limit, tab, mode = "increment") {
    set((state) =>
      getCardQuantityUpdate(state, deckId, code, quantity, limit, tab, mode),
    );
    dehydrate(get(), "edits").catch(console.error);
  },
  updateTabooId(deckId, value) {
    set((state) => ({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          tabooId: value,
          type: "user" as const,
        },
      },
    }));

    dehydrate(get(), "edits").catch(console.error);
  },
  updateDescription(deckId, value) {
    set((state) => ({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          description_md: value,
          type: "user" as const,
        },
      },
    }));

    dehydrate(get(), "edits").catch(console.error);
  },
  updateName(deckId, value) {
    set((state) => ({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          name: value,
          type: "user" as const,
        },
      },
    }));

    dehydrate(get(), "edits").catch(console.error);
  },
  updateMetaProperty(deckId, key, value) {
    set((state) => {
      const edits = currentEdits(state, deckId);
      return {
        deckEdits: {
          ...state.deckEdits,
          [deckId]: {
            ...edits,
            meta: {
              ...edits.meta,
              [key]: value || null,
            },
            type: "user" as const,
          },
        },
      };
    });

    dehydrate(get(), "edits").catch(console.error);
  },
  updateInvestigatorSide(deckId, side, code) {
    set((state) => ({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          [`investigator${capitalize(side)}`]: code,
          type: "user" as const,
        },
      },
    }));

    dehydrate(get(), "edits").catch(console.error);
  },
  updateCustomization(deckId, code, index, patch) {
    set((state) => {
      const edits = currentEdits(state, deckId);
      return {
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
            type: "user" as const,
          },
        },
      };
    });

    dehydrate(get(), "edits").catch(console.error);
  },
  updateTags(deckId, value) {
    set((state) => ({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          tags: value,
          type: "user" as const,
        },
      },
    }));

    dehydrate(get(), "edits").catch(console.error);
  },
  updateXpAdjustment(deckId, value) {
    set((state) => ({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          xpAdjustment: value,
          type: "user" as const,
        },
      },
    }));

    dehydrate(get(), "edits").catch(console.error);
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

    set((prev) => {
      const rbwQuantity =
        resolvedDeck.slots[SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS] ?? 0;
      const weaknessQuantity = resolvedDeck.slots[weakness] ?? 0;

      const edits = currentEdits(prev, deckId);

      return {
        deckEdits: {
          ...prev.deckEdits,
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
            type: "user" as const,
          },
        },
      };
    });

    dehydrate(get(), "edits").catch(console.error);

    return metadata.cards[weakness];
  },
  updateAttachment({ deck, targetCode, code, quantity, limit }) {
    set((state) => {
      const attachments = state.deckEdits[deck.id]?.attachments ?? {};

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

      return {
        deckEdits: {
          ...state.deckEdits,
          [deck.id]: {
            ...state.deckEdits[deck.id],
            attachments,
            type: "user" as const,
          },
        },
      };
    });

    dehydrate(get(), "edits").catch(console.error);
  },

  swapDeck(card, deckId, target) {
    set((state) => {
      const source = target === "slots" ? "sideSlots" : "slots";
      const deck = selectResolvedDeckById(state, deckId, true);
      const quantity = deck?.[source]?.[card.code] ?? 0;
      if (!quantity) return {};

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

      const sourceQuantity = Math.max(
        (deck?.[source]?.[card.code] ?? 0) - 1,
        0,
      );

      return {
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
            type: "user" as const,
          },
        },
      };
    });

    dehydrate(get(), "edits").catch(console.error);
  },
  updateAnnotation(deckId, code, value) {
    set((state) => {
      const edits = currentEdits(state, deckId);
      return {
        deckEdits: {
          ...state.deckEdits,
          [deckId]: {
            ...edits,
            annotations: {
              ...edits.annotations,
              [code]: value,
            },
            type: "user" as const,
          },
        },
      };
    });

    dehydrate(get(), "edits").catch(console.error);
  },
  upgradeCard(payload) {
    set((state) => getCardUpgrade(state, payload));
  },
  applyShrewdAnalysis({ availableUpgrades, code, deckId, slots }) {
    set((state) => {
      const metadata = selectMetadata(state);

      const upgrades = availableUpgrades.upgrades[code];
      assert(upgrades.length, "No upgrades available for card");

      const quantity = cardLimit(upgrades[0]);

      const randomUpgrades = range(0, quantity).map(() => {
        return upgrades[Math.floor(Math.random() * upgrades.length)];
      });

      let nextState: Partial<StoreState> = {};

      for (const upgrade of randomUpgrades) {
        nextState = getCardUpgrade(
          { ...state, ...nextState },
          {
            availableUpgrades,
            code,
            deckId,
            delta: 1,
            slots,
            upgradeCode: upgrade.code,
          },
        );
      }

      const sourceCard = metadata.cards[code];

      if (nextState?.deckEdits?.[deckId]) {
        nextState.deckEdits[deckId].xpAdjustment =
          (upgrades[0].xp ?? 0) - (sourceCard.xp ?? 0);
      }

      return nextState;
    });
  },
  completeTask(deckId, card) {
    assert(
      card.real_traits?.includes("Task"),
      `${displayAttribute(card, "name")} is not a Task.`,
    );

    const completeId = card.back_link_id ?? `${card.code.slice(0, -1)}b`;

    set((state) => {
      let nextState = getCardQuantityUpdate(
        state,
        deckId,
        card.code,
        0,
        1,
        "slots",
        "set",
      );

      nextState = getCardQuantityUpdate(
        { ...state, ...nextState },
        deckId,
        completeId,
        1,
        1,
        "slots",
        "set",
      );

      return nextState;
    });

    dehydrate(get(), "edits").catch(console.error);
    return completeId;
  },
});

function getCardQuantityUpdate(
  state: StoreState,
  deckId: Id,
  code: string,
  quantity: number,
  limit: number,
  tab?: Slot,
  mode: "increment" | "set" = "increment",
  type: "system" | "user" = "user",
) {
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
        type,
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
        [deckId]: state.recommender.coreCards[deckId].filter((c) => c !== code),
      },
    };
  }

  return nextState;
}

function getCardUpgrade(
  state: StoreState,
  {
    availableUpgrades,
    code,
    deckId,
    delta,
    slots,
    upgradeCode,
  }: UpgradePayload,
) {
  const metadata = selectMetadata(state);

  const deck = selectResolvedDeckById(state, deckId, true);
  assert(deck, `Tried to edit deck that does not exist: ${deckId}`);

  let nextState = getCardQuantityUpdate(
    state,
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
    nextState = getCardQuantityUpdate(
      { ...state, ...nextState },
      deckId,
      code,
      delta * -1,
      cardLimit(metadata.cards[code]),
      slots,
    );
  }

  return nextState;
}
