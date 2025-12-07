import type { StateCreator, StoreApi } from "zustand";
import { assertCanPublishDeck } from "@/utils/arkhamdb";
import { assert } from "@/utils/assert";
import { applyHiddenSlots } from "../lib/fan-made-content";
import { resolveDeck } from "../lib/resolve-deck";
import { disconnectProviderIfUnauthorized, syncAdapters } from "../lib/sync";
import { dehydrate } from "../persist";
import { DeckSchema, type Id } from "../schemas/deck.schema";
import {
  selectIsInitialized,
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "../selectors/shared";
import { getDecks, newDeck, updateDeck } from "../services/queries";
import { ApiError } from "../services/requests/shared";
import type { StoreState } from ".";
import type {
  Connection,
  ConnectionsSlice,
  SyncInit,
  SyncSuccessState,
} from "./connections.types";

function getInitialConnectionsState() {
  return {
    data: {},
  };
}

export const createConnectionsSlice: StateCreator<
  StoreState,
  [],
  [],
  ConnectionsSlice
> = (set, get) => ({
  connections: getInitialConnectionsState(),

  async sync(init) {
    assert(
      selectIsInitialized(get()),
      "Store must be initialized before syncing",
    );

    if (init) {
      await createConnection(init, get, set);
    } else {
      set((prev) => ({
        remoting: {
          ...prev.remoting,
          sync: true,
        },
      }));
    }

    try {
      for (const connection of Object.values(get().connections.data)) {
        await syncConnection(connection, get, set);
      }
    } finally {
      await dehydrate(get(), "app");

      set((prev) => ({
        remoting: {
          ...prev.remoting,
          sync: false,
        },
      }));
    }
  },

  async unsync(provider) {
    const state = get();

    const patch = {
      connections: structuredClone(state.connections),
      data: structuredClone(state.data),
    };

    delete patch.connections.data[provider];

    for (const deckId of Object.keys(state.data.decks)) {
      const deck = state.data.decks[deckId];
      if (deck.source === provider) {
        delete patch.data.decks[deckId];
        delete patch.data.history[deckId];
      }
    }

    set(patch);

    await dehydrate(get(), "app");
  },
  async uploadDeck(id, provider) {
    const state = get();

    const deck = structuredClone(state.data.decks[id]);
    assert(deck, `Deck with id ${id} was not found.`);

    const resolved = resolveDeck(
      {
        lookupTables: selectLookupTables(state),
        metadata: selectMetadata(state),
        sharing: state.sharing,
      },
      selectLocaleSortingCollator(state),
      deck,
    );

    assertCanPublishDeck(resolved);

    const connection = state.connections.data[provider];
    assert(connection, `Connection for ${provider} was not found.`);

    const adapter = new syncAdapters[provider](get);

    assert(
      !deck.previous_deck && !deck.next_deck,
      `Deck ${deck.next_deck ? "has" : "is"} an upgrade. Please 'Duplicate' the deck in order to upload it`,
    );

    state.setRemoting("arkhamdb", true);

    try {
      const { id } = await newDeck(state.app.clientId, adapter.out(deck));
      const nextDeck = adapter.in(
        await updateDeck(state.app.clientId, adapter.out({ ...deck, id })),
      );

      set((prev) => ({
        data: {
          ...prev.data,
          decks: {
            ...prev.data.decks,
            [nextDeck.id]: nextDeck,
          },
          history: {
            ...prev.data.history,
            [nextDeck.id]: [],
          },
        },
      }));

      await state.deleteDeck(deck.id);

      return nextDeck.id;
    } catch (err) {
      disconnectProviderIfUnauthorized("arkhamdb", err, set);
      throw err;
    } finally {
      state.setRemoting("arkhamdb", false);
      dehydrate(get(), "app").catch(console.error);
    }
  },
});

function getInitialConnection({ user, provider }: SyncInit) {
  return {
    createdAt: Date.now(),
    provider,
    status: "connected" as const,
    user,
  };
}

async function createConnection(
  { provider, user }: SyncInit,
  get: StoreApi<StoreState>["getState"],
  set: StoreApi<StoreState>["setState"],
) {
  assert(provider, "Provider must be defined");

  set((prev) => ({
    connections: {
      ...prev.connections,
      data: {
        ...prev.connections.data,
        [provider]: getInitialConnection({ user, provider }),
      },
    },
    remoting: {
      ...prev.remoting,
      sync: true,
    },
  }));

  await dehydrate(get(), "app");
}

async function syncConnection(
  connection: Connection,
  get: StoreApi<StoreState>["getState"],
  set: StoreApi<StoreState>["setState"],
) {
  const state = get();
  const adapater = new syncAdapters[connection.provider](get);

  try {
    const res = await getDecks(
      state.app.clientId,
      (connection.syncDetails as SyncSuccessState)?.lastModified,
    );

    if (res) {
      state.cacheFanMadeContent(
        res.data.map((_deck) => {
          const deck = DeckSchema.parse(_deck);
          applyHiddenSlots(deck, selectMetadata(state));
          return deck;
        }),
      );

      set((prev) => {
        const { data: apiDecks, lastModified } = res;
        const data = structuredClone(prev.data);
        const apiDeckIds = new Set(apiDecks.map((deck) => deck.id));

        for (const deck of Object.values(prev.data.decks)) {
          if (deck.source === connection.provider && !apiDeckIds.has(deck.id)) {
            delete data.decks[deck.id];
          }
        }

        for (const deck of apiDecks) {
          data.decks[deck.id] = adapater.in(deck);
        }

        data.history = Object.values(data.decks)
          .filter((deck) => !deck.next_deck)
          .reduce(
            (acc, deck) => {
              acc[deck.id] = [];
              if (!deck.previous_deck) return acc;

              let current = deck;
              const history = [];

              while (
                current.previous_deck &&
                data.decks[current.previous_deck]
              ) {
                current = data.decks[current.previous_deck];
                history.push(current.id);
              }

              acc[deck.id] = history;
              return acc;
            },
            {} as Record<Id, Id[]>,
          );

        const user = apiDecks.length
          ? {
              id: apiDecks[0].user_id ?? undefined,
            }
          : prev.connections.data[connection.provider]?.user;

        return {
          data,
          connections: {
            lastSyncedAt: Date.now(),
            data: {
              ...prev.connections.data,
              [connection.provider]: {
                ...prev.connections.data[connection.provider],
                status: "connected",
                user,
                syncDetails: {
                  status: "success",
                  errors: [],
                  lastModified,
                  itemsSynced: apiDecks.length,
                  itemsTotal: apiDecks.length,
                },
              },
            },
          },
        };
      });
    } else {
      set((prev) => ({
        connections: {
          ...prev.connections,
          lastSyncedAt: Date.now(),
        },
      }));
    }
  } catch (err) {
    set((prev) => ({
      connections: {
        lastSyncedAt: Date.now(),
        data: {
          ...prev.connections.data,
          [connection.provider]: {
            ...prev.connections.data[connection.provider],
            status:
              err instanceof ApiError && err.status === 401
                ? "disconnected"
                : "connected",
            syncDetails: {
              status: "error",
              errors: [(err as Error)?.message ?? "Unknown error"],
            },
          },
        },
      },
    }));
    throw err;
  }
}
