import { type Card, type Deck, isDeck } from "@arkham-build/shared";
import type { StateCreator } from "zustand";
import factions from "@/store/services/data/factions.json";
import subTypes from "@/store/services/data/subtypes.json";
import types from "@/store/services/data/types.json";
import { assert } from "@/utils/assert";
import { inferChapterNumber } from "@/utils/chapters";
import { randomId } from "@/utils/crypto";
import { download } from "@/utils/download";
import { time, timeEnd } from "@/utils/time";
import { prepareBackup } from "../lib/backup";
import {
  createAdapter,
  deleteAdapter,
  updateAdapter,
  upgradeAdapter,
  uploadAdapter,
} from "../lib/deck-crud";
import { formatDeckImport } from "../lib/deck-io";
import { buildCacheFromDecks } from "../lib/fan-made-content";
import { mappedByCode, mappedById } from "../lib/metadata-utils";
import { isSyncedStorageProvider } from "../lib/sync";
import { dehydrate, hydrate } from "../persist";
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
    { refresh, locale, overrides } = {},
  ) {
    const persistedState = refresh ? undefined : await hydrate();

    if (
      !refresh &&
      persistedState?.metadata?.dataVersion?.cards_updated_at &&
      persistedState.metadata.dataVersion.metadata_version != null
    ) {
      const metadata = {
        ...getInitialMetadata(),
        ...persistedState.metadata,
        factions: mappedByCode(factions),
        subtypes: mappedByCode(subTypes),
        types: mappedByCode(types),
      };

      set((prev) => {
        const merged = mergeInitialState(prev, persistedState, overrides);

        return {
          ...merged,
          lists: {
            ...makeLists(merged.settings),
            ...merged.lists,
          },
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
    const metadata: Metadata = {
      ...getInitialMetadata(),
      dataVersion: dataVersionResponse,
      cards: {},
      taboos: {},
      campaigns: mappedByCode(metadataResponse.campaign ?? []),
      cycles: mappedByCode(metadataResponse.cycle),
      packs: mappedByCode(metadataResponse.pack),
      encounterSets: mappedByCode(metadataResponse.card_encounter_set),
      factions: mappedByCode(factions),
      scenarios: mappedByCode(metadataResponse.scenario ?? []),
      subtypes: mappedByCode(subTypes),
      types: mappedByCode(types),
      tabooSets: mappedById(metadataResponse.taboo_set),
    };

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
      card.chapter = inferChapterNumber(metadata.packs[card.pack_code]);
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
        lists: {
          ...makeLists(merged.settings),
          ...merged.lists,
        },
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
  async createDeck(client) {
    const state = get();
    const deck = await createAdapter.persist(
      client,
      state,
      createAdapter.format(state),
    );
    createAdapter.transition(set, deck);
    await dehydrate(get(), "app");
    return deck.id;
  },
  async importSharedDeck(importDeck, type) {
    const state = get();

    assert(
      !state.data.decks[importDeck.id],
      `Deck with id ${importDeck.id} already exists.`,
    );

    const deck = formatDeckImport(state, importDeck as Deck, type);
    assert(isDeck(deck), "Invalid deck data.");

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
    }));

    await dehydrate(get(), "app");

    return deck.id;
  },
  async uploadDeckToProvider(client, deckId, provider) {
    const state = get();
    const deck = uploadAdapter.format(state, deckId, provider);
    const canonicalDeck = await uploadAdapter.persist(client, state, deck);
    const shouldSyncFolders =
      deck.id !== canonicalDeck.id && state.data.deckFolders[deck.id] != null;

    uploadAdapter.transition(set, deck, canonicalDeck);
    await dehydrate(get(), "app", "edits");

    if (shouldSyncFolders && get().auth.status === "authenticated") {
      await get().saveFolders(client);
    }

    return canonicalDeck.id;
  },
  async deleteDeck(client, id, cb) {
    const state = get();

    const deck = deleteAdapter.format(state, id);
    const shouldSyncFolders = hasFolderAssignmentsForDelete(state, deck.id);

    await deleteAdapter.persist(
      client,
      get,
      set,
      deck,
      state.sync.decks.items[id]?.version,
    );

    cb?.();

    deleteAdapter.transition(set, deck.id);

    await dehydrate(get(), "app", "edits");

    if (shouldSyncFolders && get().auth.status === "authenticated") {
      await get().saveFolders(client);
    }
  },
  async deleteUpgrade(client, id, cb) {
    const state = get();

    const deck = deleteAdapter.format(state, id);
    assert(deck, `Deck ${id} does not exist.`);

    const previousId = deck.previous_deck;
    const shouldSyncFolders = hasFolderAssignmentsForDelete(
      state,
      deck.id,
      true,
    );

    assert(previousId, "Deck does not have a previous deck");
    assert(state.data.decks[previousId], "Previous deck does not exist");

    await deleteAdapter.persist(
      client,
      get,
      set,
      deck,
      state.sync.decks.items[id]?.version,
    );

    cb?.(previousId);

    deleteAdapter.transition(set, deck.id, previousId);

    await dehydrate(get(), "app", "edits");

    if (shouldSyncFolders && get().auth.status === "authenticated") {
      await get().saveFolders(client);
    }

    return previousId;
  },
  async updateDeckProperties(client, deckId, properties) {
    const state = get();

    const { deck } = updateAdapter.formatPropertyPatch(
      state,
      deckId,
      properties,
    );

    const canonicalDeck = await updateAdapter.persist(
      client,
      get,
      set,
      deck,
      state.sync.decks.items[deckId]?.version,
    );

    updateAdapter.transition(set, canonicalDeck, undefined, (deckEdits) => {
      const nextEdits = { ...deckEdits };
      const edit = deckEdits[deckId];

      if (!edit) return nextEdits;

      if (properties.slots || properties.sideSlots || properties.meta) {
        delete nextEdits[deckId];
        return nextEdits;
      }

      const nextEdit = structuredClone(edit);
      if (properties.name) delete nextEdit.name;
      if (properties.tags) delete nextEdit.tags;
      nextEdits[deckId] = nextEdit;

      return nextEdits;
    });

    await dehydrate(get(), "app", "edits");

    return deck;
  },
  async saveDeck(client, deckId) {
    const state = get();
    const { deck, undo } = updateAdapter.formatSave(get(), deckId);

    const canonicalDeck = await updateAdapter.persist(
      client,
      get,
      set,
      deck,
      state.sync.decks.items[deckId]?.version,
    );

    updateAdapter.transition(set, canonicalDeck, undo, (deckEdits) => {
      const nextEdits = { ...deckEdits };
      delete nextEdits[deck.id];
      return nextEdits;
    });

    await dehydrate(get(), "app", "edits");
    return deck.id;
  },
  async upgradeDeck(client, payload) {
    const state = get();

    const deck = state.data.decks[payload.id];
    assert(deck, `Deck ${payload.id} does not exist.`);

    const upgrade = await upgradeAdapter.persist(
      client,
      get,
      set,
      deck,
      upgradeAdapter.format(state, deck, payload),
      state.sync.decks.items[deck.id]?.version,
    );

    upgradeAdapter.transition(set, deck, upgrade);

    await dehydrate(get(), "app", "edits");
    return upgrade;
  },
  backup() {
    download(
      prepareBackup(get()),
      `arkham-build-${new Date().toISOString()}.json`,
      "application/json",
    );
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
  async deleteAllDecks() {
    set((state) => {
      const decks = { ...state.data.decks };
      const history = { ...state.data.history };
      const edits = { ...state.deckEdits };
      const undoHistory = { ...state.data.undoHistory };

      for (const id of Object.keys(decks)) {
        if (!isSyncedStorageProvider(decks[id]?.source)) {
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
          undoHistory,
        },
        deckEdits: edits,
      };
    });

    await dehydrate(get(), "app", "edits");
  },
});

function hasFolderAssignmentsForDelete(
  state: StoreState,
  deckId: string | number,
  keepPreviousDeck = false,
) {
  const deletedDeckIds = keepPreviousDeck
    ? [deckId]
    : [deckId, ...(state.data.history[deckId] ?? [])];

  return deletedDeckIds.some((id) => state.data.deckFolders[id] != null);
}

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
    auth: {
      ...initialState.auth,
      ...persistedState?.auth,
      ...overrides?.auth,
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
    sync: {
      ...initialState.sync,
      ...persistedState?.sync,
      ...overrides?.sync,
      settings: {
        ...initialState.sync.settings,
        ...persistedState?.sync?.settings,
        ...overrides?.sync?.settings,
      },
      decks: {
        ...initialState.sync.decks,
        ...persistedState?.sync?.decks,
        ...overrides?.sync?.decks,
        items: {
          ...initialState.sync.decks.items,
          ...persistedState?.sync?.decks?.items,
          ...overrides?.sync?.decks?.items,
        },
      },
      folders: {
        ...initialState.sync.folders,
        ...persistedState?.sync?.folders,
        ...overrides?.sync?.folders,
      },
    },
  };
}
