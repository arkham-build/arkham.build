import type { StateCreator } from "zustand";
import { applyDeckEdits, getChangeRecord } from "@/store/lib/deck-edits";
import { createDeck } from "@/store/lib/deck-factory";
import type { Deck } from "@/store/schemas/deck.schema";
import factions from "@/store/services/data/factions.json";
import subTypes from "@/store/services/data/subtypes.json";
import types from "@/store/services/data/types.json";
import { assertCanPublishDeck, incrementVersion } from "@/utils/arkhamdb";
import { assert } from "@/utils/assert";
import { decodeExileSlots } from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { randomId } from "@/utils/crypto";
import { download } from "@/utils/download";
import { time, timeEnd } from "@/utils/time";
import { prepareBackup, restoreBackup } from "../lib/backup";
import { applyCardChanges } from "../lib/card-edits";
import { mapValidationToProblem } from "../lib/deck-io";
import {
  decodeDeckMeta,
  encodeCardPool,
  encodeSealedDeck,
} from "../lib/deck-meta";
import { buildCacheFromDecks } from "../lib/fan-made-content";
import { applyLocalData } from "../lib/local-data";
import { mappedByCode, mappedById } from "../lib/metadata-utils";
import { resolveDeck } from "../lib/resolve-deck";
import { decodeExtraSlots, encodeExtraSlots } from "../lib/slots";
import { disconnectProviderIfUnauthorized, syncAdapters } from "../lib/sync";
import type { DeckMeta } from "../lib/types";
import { dehydrate, hydrate } from "../persist";
import type { Card } from "../schemas/card.schema";
import { selectDeckCreateCardSets } from "../selectors/deck-create";
import {
  selectDeckHistory,
  selectDeckValid,
  selectLatestUpgrade,
} from "../selectors/decks";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "../selectors/shared";
import {
  createShare,
  deleteDeck,
  newDeck,
  updateDeck,
  upgradeDeck,
} from "../services/queries";
import type { StoreState } from ".";
import type { AppSlice } from "./app.types";
import { makeLists } from "./lists";
import { getInitialMetadata } from "./metadata";
import type { Metadata } from "./metadata.types";

function getInitialAppState() {
  return {
    clientId: "",
  };
}

export const createAppSlice: StateCreator<StoreState, [], [], AppSlice> = (
  set,
  get,
) => ({
  app: getInitialAppState(),

  async init(
    queryMetadata,
    queryDataVersion,
    queryCards,
    { refresh, locale, overrides, keepListState } = {},
  ) {
    const persistedState = await hydrate();

    if (!refresh && persistedState?.metadata?.dataVersion?.cards_updated_at) {
      const metadata = {
        ...applyLocalData(persistedState.metadata),
        factions: mappedByCode(factions),
        subtypes: mappedByCode(subTypes),
        types: mappedByCode(types),
      };

      set((prev) => {
        const merged = mergeInitialState(prev, persistedState, overrides);

        return {
          ...merged,
          lists: keepListState ? merged.lists : makeLists(merged.settings),
          metadata,
          ui: {
            ...prev.ui,
            initialized: true,
            fanMadeContentCache: buildCacheFromDecks(
              Object.values(merged.data.decks),
            ),
          },
        };
      });

      return false;
    }

    time("query_data");
    const [metadataResponse, dataVersionResponse, cards] = await Promise.all([
      queryMetadata(locale),
      queryDataVersion(locale),
      queryCards(locale),
    ]);
    timeEnd("query_data");

    time("create_store_data");
    let metadata: Metadata = {
      ...getInitialMetadata(),
      dataVersion: dataVersionResponse,
      cards: {},
      taboos: {},
      cycles: mappedByCode(metadataResponse.cycle),
      packs: {
        ...mappedByCode(metadataResponse.pack),
        ...mappedByCode(metadataResponse.reprint_pack),
      },
      encounterSets: mappedByCode(metadataResponse.card_encounter_set),
      factions: mappedByCode(factions),
      subtypes: mappedByCode(subTypes),
      types: mappedByCode(types),
      tabooSets: mappedById(metadataResponse.taboo_set),
    };

    if (metadata.packs["rcore"]) {
      metadata.packs["rcore"].reprint = {
        type: "rcore",
      };
    }

    for (const c of cards) {
      if (c.taboo_set_id) {
        metadata.taboos[c.id] = {
          back_text: c.back_text,
          code: c.code,
          customization_change: c.customization_change,
          customization_options: c.customization_options,
          customization_text: c.customization_text,
          deck_options: c.deck_options,
          deck_requirements: c.deck_requirements,
          exceptional: c.exceptional,
          real_back_text: c.real_back_text,
          real_customization_change: c.real_customization_change,
          real_customization_text: c.real_customization_text,
          real_taboo_text_change: c.real_taboo_text_change,
          real_text: c.real_text,
          taboo_set_id: c.taboo_set_id,
          taboo_text_change: c.taboo_text_change,
          taboo_xp: c.taboo_xp,
          text: c.text,
        };

        continue;
      }

      // SAFE! Diverging fields are added below.
      const card = c as Card;

      const pack = metadata.packs[card.pack_code];
      const cycle = metadata.cycles[pack.cycle_code];

      // "tags" is sometimes empty string, see: https://github.com/Kamalisk/arkhamdb-json-data/pull/1351#issuecomment-1937852236
      if (!card.tags) card.tags = undefined;
      card.parallel = cycle?.code === "parallel";

      metadata.cards[card.code] = card;

      if (card.encounter_code) {
        const encounterSet = metadata.encounterSets[card.encounter_code];

        if (encounterSet) {
          if (
            !card.hidden &&
            card.position < (encounterSet.position ?? Number.MAX_SAFE_INTEGER)
          ) {
            encounterSet.position = card.position;
          }

          if (!encounterSet.pack_code) {
            encounterSet.pack_code = card.pack_code;
          }
        }
      }
    }

    metadata = applyLocalData(metadata);

    for (const code of Object.keys(metadata.encounterSets)) {
      if (!metadata.encounterSets[code].pack_code) {
        delete metadata.encounterSets[code];
      }
    }

    set((prev) => {
      const merged = mergeInitialState(prev, persistedState, overrides);

      return {
        ...merged,
        metadata,
        ui: {
          ...merged.ui,
          fanMadeContentCache: buildCacheFromDecks(
            Object.values(merged.data.decks),
          ),
        },
        lists: keepListState ? merged.lists : makeLists(merged.settings),
      };
    });

    timeEnd("create_store_data");

    await dehydrate(get(), "all");

    set((prev) => ({
      ui: {
        ...prev.ui,
        initialized: true,
      },
    }));

    return true;
  },
  async createDeck() {
    const state = get();
    const metadata = selectMetadata(state);

    assert(state.deckCreate, "DeckCreate state must be initialized.");

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

    const deckSizeOption = back.deck_options?.find((o) => !!o.deck_size_select);

    for (const [key, value] of Object.entries(state.deckCreate.selections)) {
      // EDGE CASE: mandy's taboo removes the deck size select,
      // omit any selection made from deck meta.
      if (key === "deck_size_selected" && !deckSizeOption) {
        continue;
      }

      meta[key as keyof Omit<DeckMeta, "fan_made_content" | "hidden_slots">] =
        value;
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

        if (card.code === SPECIAL_CARD_CODES.VENGEFUL_SHADE) {
          extraSlots[card.code] = quantity;
        } else {
          slots[card.code] = quantity;
        }
      }
    }

    if (Object.keys(extraSlots).length) {
      meta.extra_deck = encodeExtraSlots(extraSlots);
    }

    const cardPool = state.deckCreate.cardPool ?? [];
    if (cardPool.length) {
      meta.card_pool = encodeCardPool(cardPool);
    }

    const sealedDeck = state.deckCreate.sealed;

    if (sealedDeck) {
      Object.assign(meta, encodeSealedDeck(sealedDeck));
    }

    let deck = createDeck({
      investigator_code: state.deckCreate.investigatorCode,
      investigator_name: back.real_name,
      name: state.deckCreate.title,
      slots,
      meta: JSON.stringify(meta),
      taboo_id: state.deckCreate.tabooSetId ?? null,
      problem: "too_few_cards",
    });

    const resolved = resolveDeck(
      {
        lookupTables: selectLookupTables(state),
        metadata,
        sharing: state.sharing,
      },
      selectLocaleSortingCollator(state),
      deck,
    );

    if (resolved.fanMadeData) {
      const meta = decodeDeckMeta(deck);
      meta.fan_made_content = resolved.fanMadeData;
      deck.meta = JSON.stringify(meta);
    }

    if (state.deckCreate.provider === "arkhamdb") {
      assertCanPublishDeck(resolved);

      state.setRemoting("arkhamdb", true);

      try {
        const adapter = new syncAdapters["arkhamdb"](get);
        const { id } = await newDeck(state.app.clientId, adapter.out(deck));

        deck = adapter.in(
          await updateDeck(state.app.clientId, adapter.out({ ...deck, id })),
        );
      } catch (err) {
        disconnectProviderIfUnauthorized("arkhamdb", err, set);
        throw err;
      } finally {
        state.setRemoting("arkhamdb", false);
      }
    }

    set((prev) => ({
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
    }));

    await dehydrate(get(), "app");

    if (state.deckCreate.provider === "shared") {
      await state.createShare(deck.id as string);
    }

    return deck.id;
  },
  async deleteDeck(id, cb) {
    const state = get();

    const deck = state.data.decks[id];
    assert(deck.next_deck == null, "Cannot delete a deck that has upgrades.");

    if (deck.source === "arkhamdb") {
      state.setRemoting("arkhamdb", true);
      try {
        await deleteDeck(state.app.clientId, id, true);
      } catch (err) {
        disconnectProviderIfUnauthorized("arkhamdb", err, set);
        // when deleting, we ignore the remote error and continue to delete
      } finally {
        state.setRemoting("arkhamdb", false);
      }
    } else {
      await Promise.allSettled(
        [...state.data.history[id], deck.id].map((curr) =>
          state.deleteShare(curr as string),
        ),
      );
    }

    cb?.();

    set((prev) => {
      const history = { ...prev.data.history };
      const undoHistory = { ...prev.data.undoHistory };
      const decks = { ...prev.data.decks };
      const deckEdits = { ...prev.deckEdits };

      delete deckEdits[id];
      delete decks[id];

      const historyEntries = history[id] ?? [];

      for (const prevId of historyEntries) {
        delete decks[prevId];
        delete deckEdits[prevId];
        delete undoHistory[prevId];
      }

      delete history[id];
      delete undoHistory[id];

      return {
        data: {
          ...prev.data,
          decks,
          history,
          undoHistory,
        },
        deckEdits,
      };
    });

    await dehydrate(get(), "app", "edits");
  },
  async deleteAllDecks() {
    set((state) => {
      const decks = { ...state.data.decks };
      const history = { ...state.data.history };
      const edits = { ...state.deckEdits };
      const undoHistory = { ...state.data.undoHistory };

      for (const id of Object.keys(decks)) {
        if (decks[id].source !== "arkhamdb") {
          delete decks[id];
          delete history[id];
          delete edits[id];
          delete undoHistory[id];
        }
      }

      return {
        data: {
          ...state.data,
          decks,
          history,
        },
      };
    });

    await dehydrate(get(), "app", "edits");

    if (Object.keys(get().sharing.decks).length) {
      await get().deleteAllShares().catch(console.error);
    }
  },
  async updateDeckProperties(deckId, properties) {
    const state = get();

    const deck = state.data.decks[deckId];
    assert(deck, `Deck ${deckId} does not exist.`);

    let nextDeck = {
      ...deck,
      ...properties,
    };

    nextDeck.date_update = new Date().toISOString();
    nextDeck.version = incrementVersion(deck.version);

    if (nextDeck.source === "arkhamdb") {
      state.setRemoting("arkhamdb", true);

      try {
        const adapter = new syncAdapters.arkhamdb(get);
        nextDeck = adapter.in(
          await updateDeck(state.app.clientId, adapter.out(nextDeck)),
        );
      } catch (err) {
        disconnectProviderIfUnauthorized("arkhamdb", err, set);
        throw err;
      } finally {
        state.setRemoting("arkhamdb", false);
      }
    } else {
      await state.updateShare(nextDeck);
    }

    set((prev) => {
      const nextEdits = { ...prev.deckEdits };

      const edit = prev.deckEdits[deckId];

      if (edit) {
        if (properties.slots || properties.sideSlots || properties.meta) {
          delete nextEdits[deckId];
        } else {
          const nextEdit = structuredClone(edit);
          if (properties.name) delete nextEdit.name;
          if (properties.tags) delete nextEdit.tags;
          nextEdits[deckId] = nextEdit;
        }
      }

      return {
        deckEdits: nextEdits,
        data: {
          ...prev.data,
          decks: {
            ...prev.data.decks,
            [nextDeck.id]: nextDeck,
          },
        },
      };
    });

    await dehydrate(get(), "app", "edits");

    return nextDeck;
  },
  async saveDeck(deckId) {
    const state = get();
    const metadata = selectMetadata(state);

    const edits = state.deckEdits[deckId];

    const deck = state.data.decks[deckId];
    if (!deck) return deckId;

    const previousDeck = deck.previous_deck
      ? state.data.decks[deck.previous_deck]
      : undefined;

    let nextDeck = applyDeckEdits(deck, edits, metadata, true, previousDeck);
    nextDeck.date_update = new Date().toISOString();
    nextDeck.version = incrementVersion(deck.version);

    const resolved = resolveDeck(
      {
        lookupTables: selectLookupTables(state),
        metadata,
        sharing: state.sharing,
      },
      selectLocaleSortingCollator(state),
      nextDeck,
    );

    if (resolved.fanMadeData) {
      const meta = decodeDeckMeta(nextDeck);
      meta.fan_made_content = resolved.fanMadeData;
      nextDeck.meta = JSON.stringify(meta);
    }

    const validation = selectDeckValid(state, resolved);
    nextDeck.problem = mapValidationToProblem(validation);

    const upgrade = selectLatestUpgrade(state, resolved);

    if (upgrade) {
      nextDeck.xp_spent = upgrade.xpSpent ?? 0;
      nextDeck.xp_adjustment = upgrade.xpAdjustment ?? 0;
    }

    if (nextDeck.source === "arkhamdb") {
      assertCanPublishDeck(resolved);

      state.setRemoting("arkhamdb", true);

      try {
        const adapter = new syncAdapters.arkhamdb(get);
        nextDeck = adapter.in(
          await updateDeck(state.app.clientId, adapter.out(nextDeck)),
        );
      } catch (err) {
        disconnectProviderIfUnauthorized("arkhamdb", err, set);
        throw err;
      } finally {
        state.setRemoting("arkhamdb", false);
      }
    } else {
      await state.updateShare(nextDeck);
    }

    set((prev) => {
      const deckEdits = { ...prev.deckEdits };
      delete deckEdits[deckId];

      const undoHistory = { ...prev.data.undoHistory };

      const resolveState = {
        metadata: selectMetadata(state),
        lookupTables: selectLookupTables(state),
        sharing: state.sharing,
      };

      const undoEntry = {
        changes: getChangeRecord(
          resolveDeck(resolveState, selectLocaleSortingCollator(state), deck),
          resolveDeck(
            resolveState,
            selectLocaleSortingCollator(state),
            nextDeck,
          ),
          true,
        ),
        date_update: nextDeck.date_update,
        version: nextDeck.version,
      };

      return {
        deckEdits,
        data: {
          ...prev.data,
          decks: {
            ...prev.data.decks,
            [nextDeck.id]: nextDeck,
          },
          undoHistory: {
            ...undoHistory,
            [nextDeck.id]: [...(undoHistory[nextDeck.id] ?? []), undoEntry],
          },
        },
      };
    });

    await dehydrate(get(), "app", "edits");
    return nextDeck.id;
  },
  async upgradeDeck({ id, xp, exileString, usurped }) {
    const state = get();
    const metadata = selectMetadata(state);

    const deck = state.data.decks[id];
    assert(deck, `Deck ${id} does not exist.`);

    assert(
      !deck.next_deck,
      `Deck ${id} already has an upgrade: ${deck.next_deck}.`,
    );

    const xpCarryover =
      (deck.xp ?? 0) + (deck.xp_adjustment ?? 0) - (deck.xp_spent ?? 0);

    const now = new Date().toISOString();

    let newDeck: Deck = {
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
        sharing: state.sharing,
      },
      selectLocaleSortingCollator(state),
      newDeck,
    );

    if (resolved.fanMadeData) {
      const meta = decodeDeckMeta(newDeck);
      meta.fan_made_content = resolved.fanMadeData;
    }

    newDeck.meta = JSON.stringify(meta);

    const isShared = !!state.sharing.decks[deck.id];

    if (deck.source === "arkhamdb") {
      state.setRemoting("arkhamdb", true);
      try {
        const adapter = new syncAdapters.arkhamdb(get);
        const res = await upgradeDeck(state.app.clientId, deck.id, {
          xp,
          exiles: exileString,
          meta: newDeck.meta,
        });
        newDeck = adapter.in(res);
      } catch (err) {
        disconnectProviderIfUnauthorized("arkhamdb", err, set);
        throw err;
      } finally {
        state.setRemoting("arkhamdb", false);
      }
    } else if (isShared) {
      await createShare(
        state.app.clientId,
        newDeck,
        selectDeckHistory(
          {
            ...state,
            metadata,
            data: {
              ...state.data,
              history: {
                ...state.data.history,
                [newDeck.id]: [deck.id, ...state.data.history[deck.id]],
              },
            },
          },
          selectLookupTables(state),
          selectLocaleSortingCollator(state),
          newDeck,
        ),
      );
    }

    set((prev) => {
      const history = { ...prev.data.history };
      history[newDeck.id] = [deck.id, ...history[deck.id]];
      delete history[deck.id];

      const deckEdits = { ...prev.deckEdits };
      delete deckEdits[deck.id];

      const undoHistory = { ...prev.data.undoHistory };
      delete undoHistory[deck.id];

      const sharedDecks = { ...prev.sharing.decks };
      if (isShared) {
        sharedDecks[newDeck.id] = newDeck.date_update;
      }

      return {
        deckEdits,
        data: {
          ...prev.data,
          decks: {
            ...prev.data.decks,
            [deck.id]: {
              ...deck,
              next_deck: newDeck.id,
            },
            [newDeck.id]: newDeck,
          },
          history,
          undoHistory,
        },
        sharing: {
          ...prev.sharing,
          decks: sharedDecks,
        },
      };
    });

    await dehydrate(get(), "app", "edits");
    return newDeck;
  },
  async deleteUpgrade(id, cb) {
    const state = get();

    const deck = state.data.decks[id];

    const previousId = deck.previous_deck;

    assert(deck, `Deck ${id} does not exist.`);
    assert(previousId, "Deck does not have a previous deck");
    assert(state.data.decks[previousId], "Previous deck does not exist");

    assert(
      Array.isArray(state.data.history[deck.id]),
      "Deck history does not exist",
    );

    if (deck.source === "arkhamdb") {
      state.setRemoting("arkhamdb", true);

      try {
        await deleteDeck(state.app.clientId, deck.id, false);
      } catch (err) {
        disconnectProviderIfUnauthorized("arkhamdb", err, set);
        throw err;
      } finally {
        state.setRemoting("arkhamdb", false);
      }
    } else {
      await state.deleteShare(deck.id as string).catch(console.error);
    }

    cb?.(previousId);

    set((prev) => {
      const decks = { ...prev.data.decks };
      const history = { ...prev.data.history };
      const deckHistory = history[deck.id];

      history[previousId] = deckHistory.filter((x) => deck.previous_deck !== x);
      delete history[deck.id];

      decks[previousId] = { ...decks[previousId], next_deck: null };
      delete decks[deck.id];

      const deckEdits = { ...prev.deckEdits };
      delete deckEdits[deck.id];

      const undoHistory = { ...prev.data.undoHistory };
      delete undoHistory[deck.id];

      return {
        deckEdits,
        data: {
          ...prev.data,
          decks,
          history,
          undoHistory,
        },
      };
    });

    await dehydrate(get(), "app", "edits");
    return previousId;
  },
  backup() {
    download(
      prepareBackup(get()),
      `arkham-build-${new Date().toISOString()}.json`,
      "application/json",
    );
  },
  async restore(buffer) {
    set(await restoreBackup(get(), buffer));
    await dehydrate(get(), "app");
  },
  async dismissBanner(bannerId) {
    set((state) => {
      const banners = new Set(state.app.bannersDismissed);
      banners.add(bannerId);

      return {
        app: {
          ...state.app,
          bannersDismissed: Array.from(banners),
        },
      };
    });

    await dehydrate(get(), "app");
  },
});

function mergeInitialState(
  initialState: StoreState,
  persistedState: Partial<StoreState> | undefined,
  overrides: Partial<StoreState> | undefined,
) {
  return {
    ...initialState,
    ...persistedState,
    ...overrides,
    app: {
      ...persistedState?.app,
      ...overrides?.app,
      clientId:
        overrides?.app?.clientId || persistedState?.app?.clientId || randomId(),
    },
    settings: {
      ...initialState.settings,
      ...persistedState?.settings,
      ...overrides?.settings,
      lists: {
        ...initialState.settings.lists,
        ...persistedState?.settings?.lists,
        ...overrides?.settings?.lists,
      },
    },
  };
}
