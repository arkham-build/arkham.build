import {
  type Deck,
  type DeckId,
  type DeckMeta,
  SPECIAL_CARD_CODES,
  type StorageProvider,
} from "@arkham-build/shared";
import type { StoreApi } from "zustand";
import { incrementVersion } from "@/utils/arkhamdb";
import { assert } from "@/utils/assert";
import { decodeExileSlots } from "@/utils/card-utils";
import { randomId } from "@/utils/crypto";
import { isEmpty } from "@/utils/is-empty";
import { dehydrate } from "../persist";
import { selectDeckCreateCardSets } from "../selectors/deck-create";
import {
  findDeckHistory,
  selectDeckValid,
  selectLatestUpgrade,
} from "../selectors/decks";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "../selectors/shared";
import type { HttpClient } from "../services/http-client";
import {
  deleteDeck,
  postDeck,
  postDeckUpgrade,
  postDeckUploadBatch,
  putDeck,
} from "../services/requests/decks";
import type { StoreState } from "../slices";
import type { DeckUpgradePayload } from "../slices/app.types";
import type { UndoEntry } from "../slices/data.types";
import { normalizeArkhamDbDeck } from "./arkhamdb-decks";
import { applyCardChanges } from "./card-edits";
import { applyDeckEdits, getChangeRecord } from "./deck-edits";
import { makeDeck, makeDeckCopy } from "./deck-factory";
import { mapValidationToProblem } from "./deck-io";
import { decodeDeckMeta, encodeCardPool, encodeSealedDeck } from "./deck-meta";
import { resolveDeck } from "./resolve-deck";
import { decodeExtraSlots, encodeExtraSlots } from "./slots";
import {
  isStorageProviderAvailable,
  isSyncedStorageProvider,
  replaceDeckSyncItems,
  updateDeckSyncError,
  updateDeckSyncSaving,
  updateDeckSyncSuccess,
} from "./sync";
import { rebuildDeckHistory } from "./sync-reconciliation";
import type { ResolvedDeck } from "./types";

export const createAdapter = {
  format(state: StoreState): Deck {
    const metadata = selectMetadata(state);

    assert(state.deckCreate, "DeckCreate state must be initialized.");

    const provider = state.deckCreate.provider;
    assert(
      isStorageProviderAvailable(state, state.deckCreate.provider),
      `Storage provider ${provider} is not available.`,
    );

    const extraSlots: Record<string, number> = {};
    const meta: DeckMeta = {};
    const slots: Record<string, number> = {};

    const { investigatorCode, investigatorFrontCode, investigatorBackCode } =
      state.deckCreate;

    if (investigatorCode !== investigatorFrontCode) {
      meta.alternate_front = investigatorFrontCode;
    }

    if (investigatorCode !== investigatorBackCode) {
      meta.alternate_back = investigatorBackCode;
    }

    const back = applyCardChanges(
      metadata.cards[investigatorBackCode],
      metadata,
      state.deckCreate.tabooSetId,
      undefined,
    );

    const deckSizeOption = [
      ...(back.deck_options ?? []),
      ...(back.side_deck_options ?? []),
    ]?.find((o) => !!o.deck_size_select);

    for (const [key, value] of Object.entries(state.deckCreate.selections)) {
      // EDGE CASE: mandy's taboo removes the deck size select,
      // omit any selection made from deck meta.
      if (key === "deck_size_selected" && !deckSizeOption) {
        continue;
      }

      // Type assertion needed because DeckMeta has index signatures that TypeScript
      // can't properly narrow when using Omit
      (meta as Record<string, string | null | undefined>)[key] = value as
        | string
        | null
        | undefined;
    }

    if (deckSizeOption && !meta.deck_size_selected) {
      meta.deck_size_selected = "30";
    }

    const cardSets = selectDeckCreateCardSets(state);

    for (const set of cardSets) {
      if (!set.selected) continue;

      for (const { card } of set.cards) {
        const quantity =
          state.deckCreate.extraCardQuantities?.[card.code] ??
          set.quantities?.[card.code];

        if (!quantity) continue;

        if (set.id === "sideDeckRequiredCards") {
          extraSlots[card.code] = quantity;
        } else {
          slots[card.code] = quantity;
        }
      }
    }

    if (!isEmpty(Object.keys(extraSlots))) {
      meta.extra_deck = encodeExtraSlots(extraSlots);
    }

    const cardPool = state.deckCreate.cardPool ?? [];
    if (!isEmpty(cardPool)) {
      meta.card_pool = encodeCardPool(cardPool);
    }

    const sealedDeck = state.deckCreate.sealed;

    if (sealedDeck) {
      Object.assign(meta, encodeSealedDeck(sealedDeck));
    }

    const deck = makeDeck({
      investigator_code: state.deckCreate.investigatorCode,
      investigator_name: back.real_name,
      name: state.deckCreate.title,
      slots,
      meta: JSON.stringify(meta),
      taboo_id: state.deckCreate.tabooSetId ?? null,
      problem: "too_few_cards",
    });

    const deckResolved = resolveDeck(
      {
        lookupTables: selectLookupTables(state),
        metadata,
      },
      selectLocaleSortingCollator(state),
      deck,
    );

    updateFanMadeData(deck, deckResolved);

    deck.source = provider ?? "local";
    return deck;
  },
  async persist(client: HttpClient, state: StoreState, deck: Deck) {
    return isSyncedStorageProvider(deck.source)
      ? normalizeArkhamDbResponse(state, await postDeck(client, deck))
      : deck;
  },
  transition(set: StoreApi<StoreState>["setState"], deck: Deck) {
    return set((prev) => {
      const patch: Partial<StoreState> = {
        data: {
          ...prev.data,
          decks: {
            ...prev.data.decks,
            [deck.id]: deck,
          },
          history: {
            ...prev.data.history,
            [deck.id]: [],
          },
        },
        deckCreate: undefined,
      };

      if (isSyncedStorageProvider(deck.source)) {
        patch.sync = updateDeckSyncSuccess(
          prev.sync,
          deck.id,
          deck.version,
          Date.now(),
        );
      }

      return patch;
    });
  },
};

type SaveDeckResult = {
  deck: Deck;
  undo: UndoEntry;
};

export const updateAdapter = {
  formatPropertyPatch(state: StoreState, deckId: DeckId, patch: Partial<Deck>) {
    const deck = state.data.decks[deckId];
    assert(deck, `Deck ${deckId} does not exist.`);

    const nextDeck = {
      ...deck,
      ...patch,
    };

    updateDeckVersion(nextDeck);
    return { deck: nextDeck, undo: undefined };
  },
  formatSave(state: StoreState, deckId: DeckId): SaveDeckResult {
    const metadata = selectMetadata(state);

    const edits = state.deckEdits[deckId];

    const deck = state.data.decks[deckId];
    assert(deck, `Deck ${deckId} does not exist.`);

    const resolveState: [
      Parameters<typeof resolveDeck>[0],
      Parameters<typeof resolveDeck>[1],
    ] = [
      {
        metadata: selectMetadata(state),
        lookupTables: selectLookupTables(state),
      },
      selectLocaleSortingCollator(state),
    ];

    const deckResolved = resolveDeck(...resolveState, deck);

    const previousDeck = deck.previous_deck
      ? state.data.decks[deck.previous_deck]
      : undefined;

    let nextDeck = applyDeckEdits(deck, edits, metadata, true, previousDeck);
    if (nextDeck.source !== "arkhamdb") {
      nextDeck = clearHiddenSlots(nextDeck);
    }

    const nextResolved = resolveDeck(...resolveState, nextDeck);

    updateFanMadeData(nextDeck, nextResolved);
    updateDeckVersion(nextDeck);
    updateValidation(state, nextDeck, nextResolved);
    updateXP(state, nextDeck, nextResolved);

    return { deck: nextDeck, undo: undoEntry(deckResolved, nextResolved) };
  },
  async persist(
    client: HttpClient,
    get: StoreApi<StoreState>["getState"],
    set: StoreApi<StoreState>["setState"],
    deck: Deck,
    expectedVersion: string | null | undefined,
  ) {
    if (!isSyncedStorageProvider(deck.source)) return deck;

    assert(expectedVersion, `Deck ${deck.id} does not have a sync version.`);
    const provider = deck.source;

    set((prev) => ({
      sync: updateDeckSyncSaving(prev.sync, deck.id),
    }));

    try {
      const remoteDeck = await putDeck(client, {
        ...deck,
        expectedVersion,
        source: provider,
      });
      return normalizeArkhamDbResponse(get(), remoteDeck);
    } catch (error) {
      set((prev) => ({
        sync: updateDeckSyncError(prev.sync, deck.id, error, "update"),
      }));
      await dehydrate(get(), "app");
      throw error;
    }
  },
  transition(
    set: StoreApi<StoreState>["setState"],
    deck: Deck,
    undo: UndoEntry | undefined,
    deckEditsTransition?: (
      prev: StoreState["deckEdits"],
    ) => StoreState["deckEdits"],
  ) {
    return set((prev) => {
      const undoHistory = { ...prev.data.undoHistory };

      if (undo) {
        undoHistory[deck.id] = [
          ...(undoHistory[deck.id] ?? []),
          {
            ...undo,
            date_update: deck.date_update,
            version: deck.version,
          },
        ];
      }

      const patch: Partial<StoreState> = {
        data: {
          ...prev.data,
          decks: {
            ...prev.data.decks,
            [deck.id]: deck,
          },
          undoHistory,
        },
      };

      if (deckEditsTransition) {
        patch.deckEdits = deckEditsTransition(prev.deckEdits);
      }

      if (isSyncedStorageProvider(deck.source)) {
        patch.sync = updateDeckSyncSuccess(
          prev.sync,
          deck.id,
          deck.version,
          Date.now(),
        );
      }

      return patch;
    });
  },
};

export const deleteAdapter = {
  format(state: StoreState, deckId: DeckId) {
    const deck = state.data.decks[deckId];
    assert(deck, `Deck ${deckId} does not exist.`);
    assert(deck.next_deck == null, "Cannot delete a deck that has upgrades.");
    return deck;
  },
  async persist(
    client: HttpClient,
    get: StoreApi<StoreState>["getState"],
    set: StoreApi<StoreState>["setState"],
    deck: Deck,
    expectedVersion: string | undefined | null,
    all: boolean,
  ) {
    if (!isSyncedStorageProvider(deck.source)) return deck;

    assert(expectedVersion, `Deck ${deck.id} does not have a sync version.`);

    set((prev) => ({
      sync: updateDeckSyncSaving(prev.sync, deck.id),
    }));

    try {
      await deleteDeck(client, deck.id, {
        all,
        expectedVersion,
        provider: deck.source,
      });
    } catch (error) {
      set((prev) => ({
        sync: updateDeckSyncError(prev.sync, deck.id, error, "delete"),
      }));
      await dehydrate(get(), "app");
      throw error;
    }
  },
  transition(
    set: StoreApi<StoreState>["setState"],
    id: DeckId,
    previousId?: DeckId,
  ) {
    return set((prev) => {
      const history = { ...prev.data.history };
      const undoHistory = prev.data.undoHistory
        ? { ...prev.data.undoHistory }
        : undefined;
      const decks = { ...prev.data.decks };
      const deckEdits = { ...prev.deckEdits };
      const deckFolders = { ...prev.data.deckFolders };
      const syncItems = { ...prev.sync.decks.items };
      const historyEntries = history[id] ?? [];

      delete deckEdits[id];
      delete decks[id];
      delete deckFolders[id];
      delete undoHistory?.[id];
      delete history[id];
      delete syncItems[id];

      if (previousId) {
        if (decks[previousId]) {
          decks[previousId] = {
            ...decks[previousId],
            next_deck: null,
          };
        }

        history[previousId] =
          historyEntries[0] === previousId
            ? historyEntries.slice(1)
            : (history[previousId] ?? []);
      } else {
        for (const prevId of historyEntries) {
          delete decks[prevId];
          delete deckEdits[prevId];
          delete undoHistory?.[prevId];
          delete deckFolders[prevId];
          delete syncItems[prevId];
        }
      }

      return {
        data: {
          ...prev.data,
          decks,
          deckFolders,
          history,
          undoHistory,
        },
        deckEdits,
        sync: replaceDeckSyncItems(prev.sync, syncItems),
      };
    });
  },
};

export const uploadAdapter = {
  format(state: StoreState, deckId: DeckId, provider: StorageProvider) {
    const deck = state.data.decks[deckId];

    assert(deck, `Deck ${deckId} does not exist.`);

    assert(
      isSyncedStorageProvider(provider),
      `Unsupported deck provider: ${provider}.`,
    );

    assert(
      isStorageProviderAvailable(state, provider),
      `Storage provider ${provider} is not available.`,
    );

    assert(
      !isSyncedStorageProvider(deck.source),
      `Deck ${deckId} is already synced.`,
    );

    if (provider === "arkhamdb") {
      assert(
        !deck.previous_deck && !deck.next_deck,
        "Upgraded decks cannot be uploaded to ArkhamDB.",
      );

      return [{ ...deck, source: provider }];
    }

    return collectLocalDeckChain(state, deck).map((item) =>
      clearHiddenSlots({
        ...item,
        source: provider,
      }),
    );
  },
  async persist(client: HttpClient, state: StoreState, decks: Deck[]) {
    if (decks.length === 1) {
      const deck = decks[0];
      assert(deck, "Missing deck to upload.");
      return [normalizeArkhamDbResponse(state, await postDeck(client, deck))];
    }

    return await postDeckUploadBatch(client, { decks });
  },
  transition(
    set: StoreApi<StoreState>["setState"],
    previousDecks: Deck[],
    uploadedDecks: Deck[],
  ) {
    return set((prev) => {
      assert(
        previousDecks.length === uploadedDecks.length,
        "Uploaded deck count must match local deck count.",
      );

      const decks = { ...prev.data.decks };
      const deckFolders = { ...prev.data.deckFolders };
      const deckEdits = { ...prev.deckEdits };

      const undoHistory = prev.data.undoHistory
        ? { ...prev.data.undoHistory }
        : undefined;

      const uploadedById = new Map(
        uploadedDecks.map((deck) => [deck.id, deck]),
      );

      const now = Date.now();
      let sync = prev.sync;

      for (const previousDeck of previousDecks) {
        const deck =
          previousDecks.length === 1
            ? // single deck uploads can change id (arkhamdb)
              uploadedDecks[0]
            : // multi deck uploads are always stable (ours)
              uploadedById.get(previousDeck.id);

        assert(deck, `Missing uploaded deck ${String(previousDeck.id)}.`);

        assert(
          deck.id === previousDeck.id || previousDecks.length === 1,
          "Batch uploaded deck ids must not change.",
        );

        const idChanged = deck.id !== previousDeck.id;

        if (idChanged && deckFolders[previousDeck.id]) {
          deckFolders[deck.id] = deckFolders[previousDeck.id];
          delete deckFolders[previousDeck.id];
        }

        if (idChanged && undoHistory) {
          undoHistory[deck.id] = undoHistory[previousDeck.id];
          delete undoHistory?.[previousDeck.id];
        }

        delete decks[previousDeck.id];
        decks[deck.id] = deck;
        delete deckEdits[previousDeck.id];

        sync = updateDeckSyncSuccess(sync, deck.id, deck.version, now);
      }

      return {
        data: {
          ...prev.data,
          decks,
          deckFolders,
          history: rebuildDeckHistory(decks),
          undoHistory,
        },
        deckEdits,
        sync,
      };
    });
  },
};

export const duplicateAdapter = {
  format(state: StoreState, deckId: DeckId, options?: { applyEdits: boolean }) {
    const metadata = selectMetadata(state);
    const deck = state.data.decks[deckId];
    assert(deck, `Deck ${deckId} does not exist.`);

    const sourceDeck = options?.applyEdits
      ? applyDeckEdits(deck, state.deckEdits[deckId], metadata, true)
      : deck;

    return clearHiddenSlots(makeDeckCopy(sourceDeck));
  },
};

export const upgradeAdapter = {
  format(state: StoreState, deck: Deck, payload: DeckUpgradePayload) {
    const { id, xp, exileString, usurped } = payload;
    const metadata = selectMetadata(state);

    assert(
      !deck.next_deck,
      `Deck ${id} already has an upgrade: ${deck.next_deck}.`,
    );

    const xpCarryover =
      (deck.xp ?? 0) + (deck.xp_adjustment ?? 0) - (deck.xp_spent ?? 0);

    const now = new Date().toISOString();

    const newDeck: Deck = {
      ...structuredClone(deck),
      id: randomId(),
      date_creation: now,
      date_update: now,
      next_deck: null,
      previous_deck: deck.id,
      version: "0.1",
      xp: xp + xpCarryover,
      xp_spent: null,
      xp_adjustment: null,
      exile_string: exileString ?? null,
    };

    const meta = decodeDeckMeta(deck);

    if (usurped) {
      delete newDeck.slots[SPECIAL_CARD_CODES.THE_GREAT_WORK];
      meta.transform_into = SPECIAL_CARD_CODES.LOST_HOMUNCULUS;

      for (const [code, quantity] of Object.entries(newDeck.slots)) {
        const card = metadata.cards[code];

        if (quantity && card.restrictions?.investigator) {
          delete newDeck.slots[code];
          newDeck.slots[SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS] ??= 0;
          newDeck.slots[SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS] += quantity;
        }
      }
    }

    if (exileString) {
      const exiledSlots = decodeExileSlots(exileString);
      const extraSlots = decodeExtraSlots(meta);

      for (const [code, quantity] of Object.entries(exiledSlots)) {
        if (newDeck.slots[code]) {
          newDeck.slots[code] -= quantity;
          if (newDeck.slots[code] <= 0) delete newDeck.slots[code];
        }

        if (extraSlots[code]) {
          extraSlots[code] -= quantity;
          if (extraSlots[code] <= 0) delete extraSlots[code];
        }

        if (meta[`cus_${code}`]) {
          delete meta[`cus_${code}`];
        }
      }

      meta.extra_deck = encodeExtraSlots(extraSlots);
    }

    const resolved = resolveDeck(
      {
        lookupTables: selectLookupTables(state),
        metadata,
      },
      selectLocaleSortingCollator(state),
      newDeck,
    );

    if (resolved.fanMadeData) {
      meta.fan_made_content = resolved.fanMadeData;
    }

    newDeck.meta = JSON.stringify(meta);

    return newDeck;
  },
  async persist(
    client: HttpClient,
    get: StoreApi<StoreState>["getState"],
    set: StoreApi<StoreState>["setState"],
    deck: Deck,
    upgrade: Deck,
    expectedVersion: string | null | undefined,
  ) {
    if (!isSyncedStorageProvider(deck.source)) {
      return upgrade;
    }

    assert(expectedVersion, `Deck ${deck.id} does not have a sync version.`);

    set((prev) => ({
      sync: updateDeckSyncSaving(prev.sync, deck.id),
    }));

    try {
      return normalizeArkhamDbResponse(
        get(),
        await postDeckUpgrade(client, deck.id, {
          deck: upgrade,
          expectedVersion,
          provider: deck.source,
        }),
      );
    } catch (error) {
      set((prev) => ({
        sync: updateDeckSyncError(prev.sync, deck.id, error, "upgrade"),
      }));
      await dehydrate(get(), "app");
      throw error;
    }
  },
  transition(set: StoreApi<StoreState>["setState"], deck: Deck, upgrade: Deck) {
    return set((prev) => {
      const history = { ...prev.data.history };
      history[upgrade.id] = [deck.id, ...history[deck.id]];
      delete history[deck.id];

      const deckEdits = { ...prev.deckEdits };
      delete deckEdits[deck.id];

      const undoHistory = { ...prev.data.undoHistory };
      delete undoHistory[deck.id];

      const patch: Partial<StoreState> = {
        deckEdits,
        data: {
          ...prev.data,
          decks: {
            ...prev.data.decks,
            [deck.id]: {
              ...deck,
              next_deck: upgrade.id,
            },
            [upgrade.id]: upgrade,
          },
          history,
          undoHistory,
        },
      };

      if (isSyncedStorageProvider(upgrade.source)) {
        const now = Date.now();
        patch.sync = updateDeckSyncSuccess(
          updateDeckSyncSuccess(prev.sync, deck.id, deck.version, now),
          upgrade.id,
          upgrade.version,
          now,
        );
      }

      return patch;
    });
  },
};

function normalizeArkhamDbResponse(state: StoreState, deck: Deck) {
  return deck.source === "arkhamdb" ? normalizeArkhamDbDeck(deck, state) : deck;
}

function clearHiddenSlots(deck: Deck) {
  const meta = decodeDeckMeta(deck);
  if (!("hidden_slots" in meta)) return deck;

  delete meta.hidden_slots;

  return {
    ...deck,
    meta: JSON.stringify(meta),
  };
}

function collectLocalDeckChain(state: StoreState, deck: Deck) {
  const ids = findDeckHistory(deck, state.data).reverse();
  assert(ids.length, `Missing deck history for ${String(deck.id)}.`);

  return ids.map((id) => {
    const item = state.data.decks[id];
    assert(item, `Missing deck ${String(id)}.`);
    assert(
      !isSyncedStorageProvider(item.source),
      `Deck ${String(item.id)} is already synced.`,
    );

    return item;
  });
}

function updateValidation(
  state: StoreState,
  deck: Deck,
  resolved: ResolvedDeck,
) {
  const validation = selectDeckValid(state, resolved);
  deck.problem = mapValidationToProblem(validation);
}

function updateDeckVersion(deck: Deck) {
  deck.date_update = new Date().toISOString();
  deck.version = incrementVersion(deck.version);
}

function updateFanMadeData(deck: Deck, resolved: ResolvedDeck) {
  if (resolved.fanMadeData) {
    const meta = decodeDeckMeta(deck);
    meta.fan_made_content = resolved.fanMadeData;
    deck.meta = JSON.stringify(meta);
  }
}

function updateXP(state: StoreState, deck: Deck, resolved: ResolvedDeck) {
  const upgrade = selectLatestUpgrade(state, resolved);
  if (upgrade) {
    deck.xp_spent = upgrade.xpSpent ?? 0;
    deck.xp_adjustment = upgrade.xpAdjustment ?? 0;
  }
}

function undoEntry(deckResolved: ResolvedDeck, nextResolved: ResolvedDeck) {
  return {
    changes: getChangeRecord(deckResolved, nextResolved, true),
    date_update: nextResolved.date_update,
    version: nextResolved.version,
  };
}
