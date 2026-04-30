import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreApi } from "zustand";
import { getMockHttpClient, getMockStore } from "@/test/get-mock-store";
import type { Deck } from "../schemas/deck.schema";
import type { StoreState } from ".";

describe("sync slice", () => {
  let store: StoreApi<StoreState>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    store = await getMockStore();
  });

  it("removes stale remote decks when the authenticated account changes", async () => {
    const loadRemoteSettings = vi.fn().mockResolvedValue(undefined);
    const syncDecks = vi.fn().mockResolvedValue(undefined);

    store.setState({
      auth: {
        status: "authenticated",
        session: {
          account: {
            id: "new-account",
            name: "User",
            email: "user@example.com",
          },
        },
      },
      data: {
        ...store.getState().data,
        decks: {
          local: makeDeck({ id: "local" }),
          remote: makeDeck({ id: "remote", source: "account" }),
        },
        history: {
          local: [],
          remote: [],
        },
      },
      deckEdits: {
        remote: {},
      },
      sharing: {
        decks: {
          remote: "2026-01-01T00:00:00.000Z",
        },
      },
      sync: {
        settings: {
          accountId: "old-account",
          revision: "1",
          lastSyncedAt: Date.now(),
          status: "synced",
          error: null,
          conflict: null,
        },
        decks: {
          accountId: "old-account",
          manifestVersion: "1",
          lastSyncedAt: Date.now(),
          status: "synced",
          error: null,
          items: {
            remote: makeSyncItem(),
          },
        },
      },
      loadRemoteSettings,
      syncDecks,
    });

    await store.getState().bootstrapAuthenticatedState(getMockHttpClient());

    expect(store.getState().data.decks.remote).toBeUndefined();
    expect(store.getState().data.decks.local).toBeDefined();
    expect(store.getState().deckEdits.remote).toBeUndefined();
    expect(store.getState().sharing.decks.remote).toBeUndefined();
    expect(store.getState().sync.settings.accountId).toBeNull();
    expect(store.getState().sync.decks.accountId).toBeNull();
    expect(loadRemoteSettings).toHaveBeenCalledOnce();
    expect(syncDecks).toHaveBeenCalledOnce();
  });
});

function makeSyncItem() {
  return {
    version: "1",
    status: "synced" as const,
    lastSyncedAt: Date.now(),
    error: null,
    conflict: null,
  };
}

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-01T00:00:00.000Z",
    description_md: "",
    exile_string: null,
    id: "deck-id",
    ignoreDeckLimitSlots: null,
    investigator_code: "01001",
    investigator_name: "Investigator",
    meta: "{}",
    name: "Deck",
    next_deck: null,
    previous_deck: null,
    problem: null,
    sideSlots: null,
    slots: {},
    source: null,
    taboo_id: null,
    tags: "",
    user_id: null,
    version: "1",
    xp: null,
    xp_adjustment: null,
    xp_spent: null,
    ...overrides,
  };
}
