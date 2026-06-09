import type { Deck } from "@arkham-build/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreApi } from "zustand";
import { makeDeck } from "@/store/lib/deck-factory";
import * as deckRequests from "@/store/services/requests/decks";
import { getMockHttpClient, getMockStore } from "@/test/get-mock-store";
import type { StoreState } from ".";

vi.mock("@/store/services/requests/decks", () => ({
  deleteDeck: vi.fn(),
  isDeckConflictError: vi.fn(() => false),
  postDeck: vi.fn(),
  putDeck: vi.fn(),
}));

describe("app deck write-through actions", () => {
  const client = getMockHttpClient();
  let store: StoreApi<StoreState>;

  beforeEach(async () => {
    store = await getMockStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a local deck to account storage", async () => {
    const deck = makeTestDeck({ id: "local", source: null, version: "0.1" });
    const remoteDeck = { ...deck, source: "account" as const, version: "1" };

    vi.mocked(deckRequests.postDeck).mockResolvedValue(remoteDeck);
    setAuthenticated(store);
    store.setState({
      data: makeData({ decks: { local: deck }, history: { local: [] } }),
      deckEdits: { local: { name: "Unsaved" } },
    });

    const id = await store
      .getState()
      .uploadDeckToProvider(client, "local", "account");

    expect(id).toBe("local");
    expect(deckRequests.postDeck).toHaveBeenCalledWith(expect.anything(), {
      ...deck,
      source: "account",
    });
    expect(store.getState().data.decks.local.source).toBe("account");
    expect(store.getState().sync.decks.items.local).toMatchObject({
      version: "1",
      status: "synced",
    });
  });

  it("uploads a local deck to arkhamdb storage", async () => {
    const deck = makeTestDeck({ id: "local", source: null, version: "0.1" });
    const remoteDeck = { ...deck, source: "arkhamdb" as const, version: "1" };

    vi.mocked(deckRequests.postDeck).mockResolvedValue(remoteDeck);
    setAuthenticated(store, [
      {
        provider: "arkhamdb",
        providerUserId: "123",
        canDisconnect: true,
        details: {
          lastError: null,
          lastSyncedAt: null,
          status: "healthy",
          username: "test-user",
        },
      },
    ]);
    store.setState({
      data: makeData({ decks: { local: deck }, history: { local: [] } }),
      deckEdits: { local: { name: "Unsaved" } },
    });

    const id = await store
      .getState()
      .uploadDeckToProvider(client, "local", "arkhamdb");

    expect(id).toBe("local");
    expect(deckRequests.postDeck).toHaveBeenCalledWith(expect.anything(), {
      ...deck,
      source: "arkhamdb",
    });
    expect(store.getState().data.decks.local.source).toBe("arkhamdb");
    expect(store.getState().sync.decks.items.local).toMatchObject({
      version: "1",
      status: "synced",
    });
  });

  it("syncs folders after upload when the deck id changes", async () => {
    const deck = makeTestDeck({ id: "local", source: null, version: "0.1" });
    const remoteDeck = makeTestDeck({
      ...deck,
      id: "remote",
      source: "account",
      version: "1",
    });
    const saveFolders = vi.fn().mockResolvedValue(undefined);

    vi.mocked(deckRequests.postDeck).mockResolvedValue(remoteDeck);
    setAuthenticated(store);
    store.setState({
      data: makeData({
        decks: { local: deck },
        deckFolders: { local: "folder" },
        history: { local: [] },
      }),
      saveFolders,
    });

    await store.getState().uploadDeckToProvider(client, "local", "account");

    expect(store.getState().data.deckFolders.local).toBeUndefined();
    expect(store.getState().data.deckFolders.remote).toBe("folder");
    expect(saveFolders).toHaveBeenCalledWith(client);
  });

  it("keeps an uploaded deck local when the account request fails", async () => {
    const deck = makeTestDeck({ id: "local", source: null, version: "0.1" });

    vi.mocked(deckRequests.postDeck).mockRejectedValue(new Error("boom"));
    setAuthenticated(store);
    store.setState({
      data: makeData({ decks: { local: deck }, history: { local: [] } }),
    });

    await expect(
      store.getState().uploadDeckToProvider(client, "local", "account"),
    ).rejects.toThrow();

    expect(store.getState().data.decks.local.source).toBeNull();
  });

  it("creates local decks without calling the backend", async () => {
    store.getState().initCreate("01001");
    store.getState().deckCreateSetProvider("local");

    const id = await store.getState().createDeck(client);

    expect(deckRequests.postDeck).not.toHaveBeenCalled();
    expect(store.getState().data.decks[id]).toBeDefined();
    expect(store.getState().sync.decks.items[id]).toBeUndefined();
  });

  it("creates remote decks through the selected provider", async () => {
    const remoteDeck = makeTestDeck({
      id: "remote",
      source: "account",
      version: "1",
    });

    vi.mocked(deckRequests.postDeck).mockResolvedValue(remoteDeck);
    setAuthenticated(store);
    store.getState().initCreate("01001");
    store.getState().deckCreateSetProvider("account");

    const id = await store.getState().createDeck(client);

    expect(id).toBe("remote");
    expect(deckRequests.postDeck).toHaveBeenCalledOnce();
    expect(store.getState().data.decks.remote.source).toBe("account");
    expect(store.getState().sync.decks.items.remote).toMatchObject({
      version: "1",
      status: "synced",
    });
  });

  it("creates arkhamdb decks when an arkhamdb identity is connected", async () => {
    const remoteDeck = makeTestDeck({
      id: "remote",
      source: "arkhamdb",
      version: "1",
    });

    vi.mocked(deckRequests.postDeck).mockResolvedValue(remoteDeck);
    setAuthenticated(store, [
      {
        provider: "arkhamdb",
        providerUserId: "123",
        canDisconnect: true,
        details: {
          lastError: null,
          lastSyncedAt: null,
          status: "healthy",
          username: "test-user",
        },
      },
    ]);
    store.getState().initCreate("01001");
    store.getState().deckCreateSetProvider("arkhamdb");

    const id = await store.getState().createDeck(client);

    expect(id).toBe("remote");
    expect(deckRequests.postDeck).toHaveBeenCalledOnce();
    expect(store.getState().data.decks.remote.source).toBe("arkhamdb");
    expect(store.getState().sync.decks.items.remote).toMatchObject({
      version: "1",
      status: "synced",
    });
  });

  it("throws when creating account decks while unauthenticated", async () => {
    store.getState().initCreate("01001");
    store.getState().deckCreateSetProvider("account");

    await expect(store.getState().createDeck(client)).rejects.toThrow(
      "Storage provider account is not available.",
    );
    expect(deckRequests.postDeck).not.toHaveBeenCalled();
  });

  it("saves account decks with the expected version", async () => {
    const deck = makeTestDeck({
      id: "remote",
      source: "account",
      version: "1",
    });
    const remoteDeck = makeTestDeck({
      ...deck,
      name: "Backend",
      source: "account",
      version: "2",
    });

    vi.mocked(deckRequests.putDeck).mockResolvedValue(remoteDeck);
    setAuthenticated(store);
    store.setState({
      data: makeData({ decks: { remote: deck }, history: { remote: [] } }),
      deckEdits: { remote: { name: "Unsaved" } },
      sync: makeSync({ remote: makeSyncItem("1") }),
    });

    await store.getState().saveDeck(client, "remote");

    expect(deckRequests.putDeck).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: "remote", expectedVersion: "1" }),
    );
    expect(store.getState().data.decks.remote).toMatchObject({
      name: "Backend",
      source: "account",
      version: "2",
    });
    expect(store.getState().deckEdits.remote).toBeUndefined();
    expect(store.getState().sync.decks.items.remote).toMatchObject({
      version: "2",
      status: "synced",
    });
  });

  it("keeps account deck edits when save fails", async () => {
    const deck = makeTestDeck({
      id: "remote",
      source: "account",
      version: "1",
    });

    vi.mocked(deckRequests.putDeck).mockRejectedValue(new Error("nope"));
    setAuthenticated(store);
    store.setState({
      data: makeData({ decks: { remote: deck }, history: { remote: [] } }),
      deckEdits: { remote: { name: "Unsaved" } },
      sync: makeSync({ remote: makeSyncItem("1") }),
    });

    await expect(store.getState().saveDeck(client, "remote")).rejects.toThrow(
      "nope",
    );

    expect(store.getState().data.decks.remote).toBe(deck);
    expect(store.getState().deckEdits.remote).toEqual({ name: "Unsaved" });
    expect(store.getState().sync.decks.items.remote).toMatchObject({
      status: "error",
    });
  });

  it("deletes account decks after backend deletion succeeds", async () => {
    const deck = makeTestDeck({
      id: "remote",
      source: "account",
      version: "1",
    });
    const callback = vi.fn();

    vi.mocked(deckRequests.deleteDeck).mockResolvedValue(undefined);
    setAuthenticated(store);
    store.setState({
      data: makeData({ decks: { remote: deck }, history: { remote: [] } }),
      sync: makeSync({ remote: makeSyncItem("1") }),
    });

    await store.getState().deleteDeck(client, "remote", callback);

    expect(deckRequests.deleteDeck).toHaveBeenCalledWith(
      expect.anything(),
      "remote",
      {
        expectedVersion: "1",
      },
    );
    expect(callback).toHaveBeenCalledOnce();
    expect(store.getState().data.decks.remote).toBeUndefined();
    expect(store.getState().sync.decks.items.remote).toBeUndefined();
  });

  it("syncs folders after deleting a deck with folder membership", async () => {
    const deck = makeTestDeck({
      id: "remote",
      source: "account",
      version: "1",
    });
    const saveFolders = vi.fn().mockResolvedValue(undefined);

    vi.mocked(deckRequests.deleteDeck).mockResolvedValue(undefined);
    setAuthenticated(store);
    store.setState({
      data: makeData({
        decks: { remote: deck },
        deckFolders: { remote: "folder" },
        history: { remote: [] },
      }),
      sync: makeSync({ remote: makeSyncItem("1") }),
      saveFolders,
    });

    await store.getState().deleteDeck(client, "remote");

    expect(store.getState().data.deckFolders.remote).toBeUndefined();
    expect(saveFolders).toHaveBeenCalledWith(client);
  });

  it("preserves other sync conflicts after deleting a deck", async () => {
    const deck = makeTestDeck({
      id: "remote",
      source: "account",
      version: "1",
    });
    const conflictDeck = makeTestDeck({
      id: "conflict",
      source: "account",
      version: "2",
    });

    vi.mocked(deckRequests.deleteDeck).mockResolvedValue(undefined);
    setAuthenticated(store);
    store.setState({
      data: makeData({
        decks: {
          remote: deck,
          conflict: conflictDeck,
        },
        history: {
          remote: [],
          conflict: [],
        },
      }),
      sync: {
        ...makeSync({
          remote: makeSyncItem("1"),
          conflict: {
            version: "2",
            status: "conflict",
            lastSyncedAt: null,
            error: null,
            conflict: {
              kind: "update",
              remoteVersion: "3",
            },
          },
        }),
        decks: {
          ...makeSync({
            remote: makeSyncItem("1"),
            conflict: {
              version: "2",
              status: "conflict",
              lastSyncedAt: null,
              error: null,
              conflict: {
                kind: "update",
                remoteVersion: "3",
              },
            },
          }).decks,
          status: "conflict",
        },
      },
    });

    await store.getState().deleteDeck(client, "remote");

    expect(store.getState().sync.decks.items.remote).toBeUndefined();
    expect(store.getState().sync.decks.items.conflict).toMatchObject({
      status: "conflict",
    });
    expect(store.getState().sync.decks.status).toBe("conflict");
  });

  it("keeps account decks when backend deletion fails", async () => {
    const deck = makeTestDeck({
      id: "remote",
      source: "account",
      version: "1",
    });
    const callback = vi.fn();

    vi.mocked(deckRequests.deleteDeck).mockRejectedValue(new Error("nope"));
    setAuthenticated(store);
    store.setState({
      data: makeData({ decks: { remote: deck }, history: { remote: [] } }),
      sync: makeSync({ remote: makeSyncItem("1") }),
    });

    await expect(
      store.getState().deleteDeck(client, "remote", callback),
    ).rejects.toThrow("nope");

    expect(callback).not.toHaveBeenCalled();
    expect(store.getState().data.decks.remote).toBe(deck);
    expect(store.getState().sync.decks.items.remote).toMatchObject({
      status: "error",
    });
  });

  it("syncs folders after deleting an upgrade with folder membership", async () => {
    const previousDeck = makeTestDeck({
      id: "previous",
      next_deck: "remote",
      source: "account",
      version: "1",
    });
    const deck = makeTestDeck({
      id: "remote",
      previous_deck: "previous",
      source: "account",
      version: "1",
    });
    const saveFolders = vi.fn().mockResolvedValue(undefined);

    vi.mocked(deckRequests.deleteDeck).mockResolvedValue(undefined);
    setAuthenticated(store);
    store.setState({
      data: makeData({
        decks: {
          previous: previousDeck,
          remote: deck,
        },
        deckFolders: { remote: "folder" },
        history: {
          remote: ["previous"],
        },
      }),
      sync: makeSync({ remote: makeSyncItem("1") }),
      saveFolders,
    });

    await store.getState().deleteUpgrade(client, "remote");

    expect(store.getState().data.deckFolders.remote).toBeUndefined();
    expect(saveFolders).toHaveBeenCalledWith(client);
  });
});

function setAuthenticated(
  store: StoreApi<StoreState>,
  identities: NonNullable<StoreState["auth"]["session"]>["identities"] = [],
) {
  store.setState({
    auth: {
      status: "authenticated",
      session: {
        account: { id: "account-id", name: "user", profileComplete: true },
        identities,
      },
    },
  });
}

function makeData(overrides: Partial<StoreState["data"]> = {}) {
  return {
    decks: {},
    folders: {},
    deckFolders: {},
    history: {},
    ...overrides,
  };
}

function makeSync(items: StoreState["sync"]["decks"]["items"]) {
  return {
    settings: {
      accountId: null,
      revision: null,
      lastSyncedAt: null,
      status: "idle" as const,
      error: null,
      conflict: null,
    },
    decks: {
      accountId: "account-id",
      manifestVersion: "manifest-version",
      lastSyncedAt: null,
      status: "synced" as const,
      error: null,
      items,
    },
    folders: {
      accountId: null,
      revision: null,
      lastSyncedAt: null,
      status: "idle" as const,
      error: null,
      conflict: null,
    },
  };
}

function makeSyncItem(version: string) {
  return {
    version,
    status: "synced" as const,
    lastSyncedAt: null,
    error: null,
    conflict: null,
  };
}

function makeTestDeck(overrides: Partial<Deck> = {}): Deck {
  const deck = makeDeck({
    investigator_code: "01001",
    investigator_name: "Roland Banks",
    name: "Deck",
    slots: {},
    meta: "{}",
    problem: null,
  });

  return {
    ...deck,
    ...overrides,
  };
}
