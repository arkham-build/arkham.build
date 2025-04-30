import type { StateCreator } from "zustand";

import { assertCanPublishDeck } from "@/utils/arkhamdb";
import { assert } from "@/utils/assert";
import type { StoreState } from ".";
import { resolveDeck } from "../lib/resolve-deck";
import { disconnectProviderIfUnauthorized, syncAdapters } from "../lib/sync";
import { selectLocaleSortingCollator } from "../selectors/shared";
import { ApiError, getDecks, newDeck, updateDeck } from "../services/queries";
import type {
  ConnectionsSlice,
  Provider,
  SyncSuccessState,
} from "./connections.types";
import type { Id } from "./data.types";

export function getInitialConnectionsState() {
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

  async createConnection(provider, user) {
    const state = get();

    const connections = {
      lastSyncedAt: undefined,
      data: {
        ...state.connections.data,
        [provider]: {
          createdAt: new Date().valueOf(),
          status: "connected" as const,
          user,
          provider,
        },
      },
    };

    set({ connections });

    await state.dehydrate("app");
    return connections;
  },
  async removeConnection(provider) {
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

    await state.dehydrate("app");
  },
  async sync() {
    const state = get();

    set({
      connections: {
        ...state.connections,
        lastSyncedAt: Date.now(),
      },
      remoting: {
        ...state.remoting,
        sync: true,
      },
    });

    try {
      for (const provider of Object.keys(state.connections.data)) {
        await state.syncProvider(provider as Provider);
      }
    } finally {
      set({
        remoting: {
          ...get().remoting,
          sync: false,
        },
      });
    }

    state.dehydrate("app").catch(console.error);
  },
  async syncProvider(provider) {
    const state = get();

    const adapater = new syncAdapters[provider](state);

    const connection = state.connections.data[provider];
    assert(connection, `Connection for ${provider} was not found.`);

    try {
      const res = await getDecks(
        (connection.syncDetails as SyncSuccessState)?.lastModified,
      );

      if (res) {
        const { data: apiDecks, lastModified } = res;

        const data = { ...state.data };

        const apiDeckIds = new Set(apiDecks.map((deck) => deck.id));

        for (const deck of Object.values(state.data.decks)) {
          if (deck.source === provider && !apiDeckIds.has(deck.id)) {
            delete data.decks[deck.id];
          }
        }

        for (const deck of apiDecks) {
          data.decks[deck.id] = adapater.in(deck);
        }

        const history = Object.values(data.decks)
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

        data.history = history;

        const user = apiDecks.length
          ? {
              id: apiDecks[0].user_id ?? undefined,
            }
          : state.connections.data[provider]?.user;

        set({
          data,
          connections: {
            lastSyncedAt: Date.now(),
            data: {
              ...state.connections.data,
              [provider]: {
                ...state.connections.data[provider],
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
        });
      } else {
        set({
          connections: {
            ...state.connections,
            lastSyncedAt: Date.now(),
          },
        });
      }
    } catch (err) {
      set({
        connections: {
          lastSyncedAt: Date.now(),
          data: {
            ...state.connections.data,
            [provider]: {
              ...state.connections.data[provider],
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
      });
      throw err;
    }
  },
  async uploadDeck(id, provider) {
    const state = get();

    const deck = structuredClone(state.data.decks[id]);
    assert(deck, `Deck with id ${id} was not found.`);

    const resolved = resolveDeck(
      state,
      selectLocaleSortingCollator(state),
      deck,
    );

    assertCanPublishDeck(resolved);

    const connection = state.connections.data[provider];
    assert(connection, `Connection for ${provider} was not found.`);

    const adapter = new syncAdapters[provider](state);

    assert(
      !deck.previous_deck && !deck.next_deck,
      `Deck ${deck.next_deck ? "has" : "is"} an upgrade. Please 'Duplicate' the deck in order to upload it`,
    );

    state.setRemoting("arkhamdb", true);

    try {
      const { id } = await newDeck(deck);
      const nextDeck = adapter.in(
        await updateDeck(adapter.out({ ...deck, id })),
      );

      set({
        data: {
          ...state.data,
          decks: {
            ...state.data.decks,
            [nextDeck.id]: nextDeck,
          },
          history: {
            ...state.data.history,
            [nextDeck.id]: [],
          },
        },
      });

      await state.deleteDeck(deck.id);

      return nextDeck.id;
    } catch (err) {
      disconnectProviderIfUnauthorized("arkhamdb", err, set);
      throw err;
    } finally {
      state.setRemoting("arkhamdb", false);
      state.dehydrate("app").catch(console.error);
    }
  },
});
