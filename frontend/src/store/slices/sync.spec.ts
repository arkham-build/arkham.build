import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreApi } from "zustand";
import * as deckRequests from "@/store/services/requests/decks";
import { getMockHttpClient, getMockStore } from "@/test/get-mock-store";
import type { Deck } from "../schemas/deck.schema";
import type { StoreState } from ".";

vi.mock("@/store/services/requests/decks", () => ({
  deleteDeck: vi.fn(),
  fetchDeckBatch: vi.fn(),
  fetchDeckManifest: vi.fn(),
  isDeckConflictError: vi.fn(() => false),
  postDeck: vi.fn(),
  postDeckUpgrade: vi.fn(),
  putDeck: vi.fn(),
}));

describe("sync slice", () => {
  let store: StoreApi<StoreState>;

  beforeEach(async () => {
    vi.clearAllMocks();
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
          },
          identities: [
            {
              provider: "email",
              email: "user@example.com",
              pendingEmail: null,
              verified: true,
            },
          ],
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

  it("refreshes a conflicted deck with the remote deck", async () => {
    const remoteDeck = makeDeck({
      id: "remote",
      name: "Remote deck",
      source: "account",
      version: "3",
    });

    vi.mocked(deckRequests.fetchDeckBatch).mockResolvedValue([remoteDeck]);
    store.setState({
      data: {
        ...store.getState().data,
        decks: {
          remote: makeDeck({ id: "remote", source: "account", version: "1" }),
        },
        history: {
          remote: [],
        },
      },
      deckEdits: {
        remote: { name: "Unsaved" },
      },
      sync: {
        ...store.getState().sync,
        decks: {
          accountId: "account-id",
          manifestVersion: "manifest",
          lastSyncedAt: null,
          status: "conflict",
          error: null,
          items: {
            remote: {
              version: "1",
              status: "conflict",
              lastSyncedAt: null,
              error: null,
              conflict: {
                kind: "update",
                remoteVersion: "2",
              },
            },
          },
        },
      },
    });

    const result = await store
      .getState()
      .resolveDeckConflictWithRefresh(getMockHttpClient(), "remote");

    expect(result).toEqual({ kind: "update" });
    expect(deckRequests.fetchDeckBatch).toHaveBeenCalledWith(
      expect.anything(),
      {
        ids: ["remote"],
      },
    );
    expect(store.getState().data.decks.remote).toMatchObject({
      name: "Remote deck",
      version: "3",
    });
    expect(store.getState().deckEdits.remote).toBeUndefined();
    expect(store.getState().sync.decks.items.remote).toMatchObject({
      status: "synced",
      version: "3",
      conflict: null,
    });
  });

  it("refreshes a delete conflict when the remote deck still exists", async () => {
    const remoteDeck = makeDeck({
      id: "remote",
      name: "Remote deck",
      source: "account",
      version: "3",
    });

    vi.mocked(deckRequests.fetchDeckBatch).mockResolvedValue([remoteDeck]);
    store.setState({
      data: {
        ...store.getState().data,
        decks: {
          remote: makeDeck({ id: "remote", source: "account", version: "1" }),
        },
        history: {
          remote: [],
        },
      },
      sync: {
        ...store.getState().sync,
        decks: {
          accountId: "account-id",
          manifestVersion: "manifest",
          lastSyncedAt: null,
          status: "conflict",
          error: null,
          items: {
            remote: {
              version: "1",
              status: "conflict",
              lastSyncedAt: null,
              error: null,
              conflict: {
                kind: "delete",
                remoteVersion: "2",
              },
            },
          },
        },
      },
    });

    const result = await store
      .getState()
      .resolveDeckConflictWithRefresh(getMockHttpClient(), "remote");

    expect(result).toEqual({ kind: "delete" });
    expect(deckRequests.fetchDeckBatch).toHaveBeenCalledWith(
      expect.anything(),
      {
        ids: ["remote"],
      },
    );
    expect(store.getState().sync.decks.items.remote).toMatchObject({
      status: "synced",
      version: "3",
      conflict: null,
    });
  });

  it("rejects refresh when the remote deck is gone", async () => {
    store.setState({
      sync: {
        ...store.getState().sync,
        decks: {
          accountId: "account-id",
          manifestVersion: "manifest",
          lastSyncedAt: null,
          status: "conflict",
          error: null,
          items: {
            remote: {
              version: "1",
              status: "conflict",
              lastSyncedAt: null,
              error: null,
              conflict: {
                kind: "update",
                remoteVersion: null,
              },
            },
          },
        },
      },
    });

    await expect(
      store
        .getState()
        .resolveDeckConflictWithRefresh(getMockHttpClient(), "remote"),
    ).rejects.toThrow("Deck remote does not have a remote copy to refresh.");

    expect(deckRequests.fetchDeckBatch).not.toHaveBeenCalled();
    expect(store.getState().sync.decks.items.remote).toMatchObject({
      status: "conflict",
      conflict: {
        kind: "update",
        remoteVersion: null,
      },
    });
  });

  it("removes a local deck when discarding a conflict without a remote deck", async () => {
    store.setState({
      data: {
        ...store.getState().data,
        decks: {
          remote: makeDeck({ id: "remote", source: "account", version: "1" }),
        },
        history: {
          remote: [],
        },
      },
      sync: {
        ...store.getState().sync,
        decks: {
          accountId: "account-id",
          manifestVersion: "manifest",
          lastSyncedAt: null,
          status: "conflict",
          error: null,
          items: {
            remote: {
              version: "1",
              status: "conflict",
              lastSyncedAt: null,
              error: null,
              conflict: {
                kind: "update",
                remoteVersion: null,
              },
            },
          },
        },
      },
    });

    const result = await store
      .getState()
      .resolveDeckConflictWithDiscard("remote");

    expect(result).toEqual({ kind: "update" });
    expect(deckRequests.fetchDeckBatch).not.toHaveBeenCalled();
    expect(store.getState().data.decks.remote).toBeUndefined();
    expect(store.getState().sync.decks.items.remote).toBeUndefined();
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
