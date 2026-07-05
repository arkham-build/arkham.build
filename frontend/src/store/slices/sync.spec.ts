import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreApi } from "zustand";
import { selectAccountSyncStatus } from "@/store/selectors/sync";
import * as deckRequests from "@/store/services/requests/decks";
import {
  makeAuthenticatedAuth,
  makeConflictSyncItem,
  makeData,
  makeSyncItem,
  makeSyncState,
  makeTestDeck,
} from "@/test/factories";
import { getMockHttpClient, getMockStore } from "@/test/get-mock-store";
import type { StoreState } from ".";

vi.mock("@/store/services/requests/decks", () => ({
  deleteDeck: vi.fn(),
  fetchDeckBatch: vi.fn(),
  fetchDeckManifest: vi.fn(),
  isDeckConflictError: vi.fn(() => false),
  postDeck: vi.fn(),
  postDeckUpgrade: vi.fn(),
  postDeckUploadBatch: vi.fn(),
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
    const loadRemoteFolders = vi.fn().mockResolvedValue(undefined);
    const loadRemoteCardTags = vi.fn().mockResolvedValue(undefined);
    const syncDecks = vi.fn().mockResolvedValue(undefined);

    store.setState({
      auth: makeAuthenticatedAuth({ account: { id: "new-account" } }),
      data: makeData({
        decks: {
          local: makeTestDeck({ id: "local" }),
          remote: makeTestDeck({ id: "remote", source: "account" }),
        },
        history: {
          local: [],
          remote: [],
        },
      }),
      deckEdits: {
        remote: {},
      },
      sync: makeSyncState({
        accountId: "old-account",
        deckItems: {
          remote: makeSyncItem(),
        },
      }),
      loadRemoteSettings,
      loadRemoteFolders,
      loadRemoteCardTags,
      syncDecks,
    });

    await store.getState().bootstrapAuthenticatedState(getMockHttpClient());

    expect(store.getState().data.decks.remote).toBeUndefined();
    expect(store.getState().data.decks.local).toBeDefined();
    expect(store.getState().deckEdits.remote).toBeUndefined();
    expect(store.getState().sync.settings.accountId).toBeNull();
    expect(store.getState().sync.decks.accountId).toBeNull();
    expect(store.getState().sync.folders.accountId).toBeNull();
    expect(store.getState().sync.cardTags.accountId).toBeNull();
    expect(loadRemoteSettings).toHaveBeenCalledOnce();
    expect(loadRemoteFolders).toHaveBeenCalledOnce();
    expect(loadRemoteCardTags).toHaveBeenCalledOnce();
    expect(syncDecks).toHaveBeenCalledOnce();
  });

  it("passes sync options during authenticated bootstrap", async () => {
    const client = getMockHttpClient();
    const loadRemoteSettings = vi.fn().mockResolvedValue(undefined);
    const loadRemoteFolders = vi.fn().mockResolvedValue(undefined);
    const loadRemoteCardTags = vi.fn().mockResolvedValue(undefined);
    const syncDecks = vi.fn().mockResolvedValue(undefined);

    store.setState({
      auth: makeAuthenticatedAuth(),
      loadRemoteSettings,
      loadRemoteFolders,
      loadRemoteCardTags,
      syncDecks,
    });

    await store
      .getState()
      .bootstrapAuthenticatedState(client, { forceArkhamdbSync: true });

    expect(syncDecks).toHaveBeenCalledWith(client, {
      forceArkhamdbSync: true,
    });
  });

  it("includes card tag status in account sync status", () => {
    store.setState({
      sync: makeSyncState({
        cardTags: { status: "saving" },
        deckStatus: "synced",
        folders: { status: "synced" },
      }),
    });

    expect(selectAccountSyncStatus(store.getState())).toBe("saving");
  });

  it("refreshes the session after syncing decks", async () => {
    const refreshSession = vi.fn().mockResolvedValue(undefined);

    vi.mocked(deckRequests.fetchDeckManifest).mockResolvedValue({
      version: "1",
      decks: [],
      arkhamdbSyncToken: null,
      providers: {
        account: { available: true },
        arkhamdb: { available: true },
      },
    });

    store.setState({
      auth: makeAuthenticatedAuth(),
      sync: makeSyncState({
        deckItems: {},
        deckStatus: "idle",
        manifestVersion: "1",
      }),
      refreshSession,
    });

    await store.getState().syncDecks(getMockHttpClient());

    expect(refreshSession).toHaveBeenCalledOnce();
  });

  it("caches fan-made content from synced decks", async () => {
    const refreshSession = vi.fn().mockResolvedValue(undefined);
    const remoteDeck = makeTestDeck({
      id: "remote",
      investigator_code: "fan-investigator",
      meta: JSON.stringify({
        fan_made_content: {
          cards: {
            "fan-investigator": {
              code: "fan-investigator",
              name: "Fan Investigator",
            },
          },
          cycles: {},
          packs: {},
          encounter_sets: {},
        },
      }),
      source: "account",
      version: "2",
    });

    vi.mocked(deckRequests.fetchDeckManifest).mockResolvedValue({
      version: "2",
      decks: [
        {
          provider: "account",
          id: "remote",
          updatedAt: "2026-01-01T00:00:00.000Z",
          version: "2",
        },
      ],
      arkhamdbSyncToken: null,
      providers: {
        account: { available: true },
        arkhamdb: { available: true },
      },
    });
    vi.mocked(deckRequests.fetchDeckBatch).mockResolvedValue([remoteDeck]);

    store.setState({
      auth: makeAuthenticatedAuth(),
      sync: makeSyncState({
        deckItems: {},
        deckStatus: "idle",
        manifestVersion: "1",
      }),
      refreshSession,
    });

    await store.getState().syncDecks(getMockHttpClient());

    expect(store.getState().data.decks.remote).toBeDefined();
    expect(
      store.getState().ui.fanMadeContentCache.cards?.["fan-investigator"],
    ).toMatchObject({ code: "fan-investigator" });
  });

  it("normalizes ArkhamDB deck problems before reconciliation", async () => {
    const remoteDeck = makeTestDeck({
      id: 123,
      problem: "arkhamdb nonsense",
      source: "arkhamdb",
      version: "2",
    });

    vi.mocked(deckRequests.fetchDeckManifest).mockResolvedValue({
      version: "2",
      decks: [
        {
          provider: "arkhamdb",
          id: 123,
          updatedAt: "2026-01-01T00:00:00.000Z",
          version: "2",
        },
      ],
      arkhamdbSyncToken: "snapshot",
      providers: {
        account: { available: true },
        arkhamdb: { available: true },
      },
    });
    vi.mocked(deckRequests.fetchDeckBatch).mockResolvedValue([remoteDeck]);

    store.setState({
      auth: makeAuthenticatedAuth(),
      refreshSession: vi.fn().mockResolvedValue(undefined),
      sync: makeSyncState({
        deckItems: {},
        deckStatus: "idle",
        manifestVersion: "1",
      }),
    });

    await store.getState().syncDecks(getMockHttpClient());

    expect(store.getState().data.decks[123]?.problem).toBe("too_few_cards");
  });

  it("refreshes a conflicted deck with the remote deck", async () => {
    const remoteDeck = makeTestDeck({
      id: "remote",
      name: "Remote deck",
      source: "account",
      version: "3",
    });

    vi.mocked(deckRequests.fetchDeckBatch).mockResolvedValue([remoteDeck]);
    store.setState({
      data: makeData({
        decks: {
          remote: makeTestDeck({
            id: "remote",
            source: "account",
            version: "1",
          }),
        },
        history: {
          remote: [],
        },
      }),
      deckEdits: {
        remote: { name: "Unsaved" },
      },
      sync: makeSyncState({
        deckStatus: "conflict",
        manifestVersion: "manifest",
        deckItems: {
          remote: makeConflictSyncItem({
            version: "1",
            conflict: {
              kind: "update",
              remoteVersion: "2",
            },
          }),
        },
      }),
    });

    const result = await store
      .getState()
      .resolveDeckConflictWithRefresh(getMockHttpClient(), "remote");

    expect(result).toEqual({ kind: "update" });
    expect(deckRequests.fetchDeckBatch).toHaveBeenCalledWith(
      expect.anything(),
      {
        targets: [{ provider: "account", id: "remote" }],
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
    const remoteDeck = makeTestDeck({
      id: "remote",
      name: "Remote deck",
      source: "account",
      version: "3",
    });

    vi.mocked(deckRequests.fetchDeckBatch).mockResolvedValue([remoteDeck]);
    store.setState({
      data: makeData({
        decks: {
          remote: makeTestDeck({
            id: "remote",
            source: "account",
            version: "1",
          }),
        },
        history: {
          remote: [],
        },
      }),
      sync: makeSyncState({
        deckStatus: "conflict",
        manifestVersion: "manifest",
        deckItems: {
          remote: makeConflictSyncItem({
            version: "1",
            conflict: {
              kind: "delete",
              remoteVersion: "2",
            },
          }),
        },
      }),
    });

    const result = await store
      .getState()
      .resolveDeckConflictWithRefresh(getMockHttpClient(), "remote");

    expect(result).toEqual({ kind: "delete" });
    expect(deckRequests.fetchDeckBatch).toHaveBeenCalledWith(
      expect.anything(),
      {
        targets: [{ provider: "account", id: "remote" }],
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
      sync: makeSyncState({
        deckStatus: "conflict",
        manifestVersion: "manifest",
        deckItems: {
          remote: makeConflictSyncItem({
            version: "1",
            conflict: {
              kind: "update",
              remoteVersion: null,
            },
          }),
        },
      }),
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
      data: makeData({
        decks: {
          remote: makeTestDeck({
            id: "remote",
            source: "account",
            version: "1",
          }),
        },
        history: {
          remote: [],
        },
      }),
      sync: makeSyncState({
        deckStatus: "conflict",
        manifestVersion: "manifest",
        deckItems: {
          remote: makeConflictSyncItem({
            version: "1",
            conflict: {
              kind: "update",
              remoteVersion: null,
            },
          }),
        },
      }),
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
