import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Deck } from "@/store/schemas/deck.schema";
import { createHttpClient } from "@/store/services/http-client";
import { getMockHttpClient, getMockStore } from "@/test/get-mock-store";

describe("auth slice", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("removes account decks on logout", async () => {
    const store = await getMockStore();

    store.setState({
      auth: {
        session: {
          account: {
            id: "account-id",
            name: "Test User",
          },
          identities: [
            {
              provider: "email",
              email: "test@example.com",
              pendingEmail: null,
              verified: true,
            },
          ],
        },
        status: "authenticated",
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
      sync: makeSync(),
    });

    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await store.getState().logout(getMockHttpClient());

    expect(store.getState().auth).toEqual({ session: null, status: "idle" });
    expect(store.getState().data.decks.remote).toBeUndefined();
    expect(store.getState().data.decks.local).toBeDefined();
    expect(store.getState().deckEdits.remote).toBeUndefined();
    expect(store.getState().sharing.decks.remote).toBeUndefined();
    expect(store.getState().sync.settings.accountId).toBeNull();
    expect(store.getState().sync.decks.accountId).toBeNull();
  });

  it("clears the stored session after an unauthorized session refresh", async () => {
    const store = await getMockStore();

    store.setState({
      auth: {
        session: {
          account: {
            id: "account-id",
            name: "Test User",
          },
          identities: [
            {
              provider: "email",
              email: "test@example.com",
              pendingEmail: null,
              verified: true,
            },
          ],
        },
        status: "authenticated",
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
      sync: makeSync(),
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createHttpClient({
      apiUrl: "http://localhost",
      onUnauthorized: () => store.getState().handleUnauthorized(),
    });

    await store.getState().initSession(client);

    expect(store.getState().auth).toEqual({
      session: null,
      status: "unauthenticated",
    });
    expect(store.getState().data.decks.remote).toBeUndefined();
    expect(store.getState().data.decks.local).toBeDefined();
    expect(store.getState().deckEdits.remote).toBeUndefined();
    expect(store.getState().sharing.decks.remote).toBeUndefined();
    expect(store.getState().sync.settings.accountId).toBeNull();
    expect(store.getState().sync.decks.accountId).toBeNull();
  });
});

function makeSync() {
  return {
    settings: {
      accountId: "account-id",
      revision: "1",
      lastSyncedAt: Date.now(),
      status: "synced" as const,
      error: null,
      conflict: null,
    },
    decks: {
      accountId: "account-id",
      manifestVersion: "1",
      lastSyncedAt: Date.now(),
      status: "synced" as const,
      error: null,
      items: {
        remote: {
          version: "1",
          status: "synced" as const,
          lastSyncedAt: Date.now(),
          error: null,
          conflict: null,
        },
      },
    },
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
