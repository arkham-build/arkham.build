import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreApi } from "zustand";
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
  isDeckConflictError: vi.fn(() => false),
  postDeck: vi.fn(),
  postDeckUploadBatch: vi.fn(),
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

  it("keeps an uploaded deck local when the account request fails", async () => {
    const deck = makeTestDeck({ id: "local", source: null, version: "0.1" });

    vi.mocked(deckRequests.postDeck).mockRejectedValue(new Error("boom"));
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({ decks: { local: deck }, history: { local: [] } }),
    });

    await expect(
      store.getState().uploadDeckToProvider(client, "local", "account"),
    ).rejects.toThrow("boom");

    expect(store.getState().data.decks.local.source).toBeNull();
  });

  it("does not upload upgraded decks to ArkhamDB", async () => {
    const deck = makeTestDeck({
      id: "local",
      previous_deck: "previous",
      source: null,
      version: "0.1",
    });

    store.setState({
      auth: makeAuthenticatedAuth({
        identities: [
          {
            canDisconnect: true,
            details: {
              lastError: null,
              lastSyncedAt: null,
              status: "healthy",
              username: "arkhamdb-user",
            },
            provider: "arkhamdb",
            providerUserId: "1",
          },
        ],
      }),
      data: makeData({ decks: { local: deck }, history: { local: [] } }),
    });

    await expect(
      store.getState().uploadDeckToProvider(client, "local", "arkhamdb"),
    ).rejects.toThrow("Upgraded decks cannot be uploaded");

    expect(deckRequests.postDeck).not.toHaveBeenCalled();
    expect(store.getState().data.decks.local.source).toBeNull();
  });

  it("keeps account deck edits when save fails", async () => {
    const deck = makeTestDeck({
      id: "remote",
      source: "account",
      version: "1",
    });

    vi.mocked(deckRequests.putDeck).mockRejectedValue(new Error("nope"));
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({ decks: { remote: deck }, history: { remote: [] } }),
      deckEdits: { remote: { name: "Unsaved" } },
      sync: makeSyncState({ deckItems: { remote: makeSyncItem() } }),
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

  it("normalizes ArkhamDB deck problems after save", async () => {
    const slots = {
      "01000": 1,
      "01006": 1,
      "01007": 1,
      "01016": 2,
      "01017": 2,
      "01018": 2,
      "01019": 2,
      "01020": 2,
      "01021": 2,
      "01022": 2,
      "01023": 2,
      "01024": 2,
      "01025": 2,
      "01030": 2,
      "01087": 2,
      "01088": 2,
      "01089": 2,
      "01090": 2,
    };
    const deck = makeTestDeck({
      id: "remote",
      problem: null,
      slots,
      source: "arkhamdb",
      version: "1",
    });
    const remoteDeck = makeTestDeck({
      ...deck,
      problem: "too_few_cards",
      version: "2",
    });

    vi.mocked(deckRequests.putDeck).mockResolvedValue(remoteDeck);
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({ decks: { remote: deck }, history: { remote: [] } }),
      sync: makeSyncState({ deckItems: { remote: makeSyncItem() } }),
    });

    await store.getState().saveDeck(client, "remote");

    expect(store.getState().data.decks.remote.problem).toBeNull();
  });

  it("keeps account decks when backend deletion fails", async () => {
    const deck = makeTestDeck({
      id: "remote",
      source: "account",
      version: "1",
    });
    const callback = vi.fn();

    vi.mocked(deckRequests.deleteDeck).mockRejectedValue(new Error("nope"));
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({ decks: { remote: deck }, history: { remote: [] } }),
      sync: makeSyncState({ deckItems: { remote: makeSyncItem() } }),
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
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({
        decks: { local: deck },
        deckFolders: { local: "folder" },
        history: { local: [] },
      }),
      saveFolders,
    });

    await expect(
      store.getState().uploadDeckToProvider(client, "local", "account"),
    ).resolves.toBe("remote");

    expect(store.getState().data.deckFolders.local).toBeUndefined();
    expect(store.getState().data.deckFolders.remote).toBe("folder");
    expect(saveFolders).toHaveBeenCalledWith(client);
  });

  it("syncs folders after deleting a deck with folder membership", async () => {
    const deck = makeTestDeck({
      id: "remote",
      source: "account",
      version: "1",
    });
    const saveFolders = vi.fn().mockResolvedValue(undefined);

    vi.mocked(deckRequests.deleteDeck).mockResolvedValue(undefined);
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({
        decks: { remote: deck },
        deckFolders: { remote: "folder" },
        history: { remote: [] },
      }),
      sync: makeSyncState({ deckItems: { remote: makeSyncItem() } }),
      saveFolders,
    });

    await store.getState().deleteDeck(client, "remote");

    expect(deckRequests.deleteDeck).toHaveBeenCalledWith(client, "remote", {
      all: true,
      expectedVersion: "1",
      provider: "account",
    });
    expect(store.getState().data.deckFolders.remote).toBeUndefined();
    expect(saveFolders).toHaveBeenCalledWith(client);
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
    store.setState({
      auth: makeAuthenticatedAuth(),
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
      sync: makeSyncState({ deckItems: { remote: makeSyncItem() } }),
      saveFolders,
    });

    await store.getState().deleteUpgrade(client, "remote");

    expect(deckRequests.deleteDeck).toHaveBeenCalledWith(client, "remote", {
      all: false,
      expectedVersion: "1",
      provider: "account",
    });
    expect(store.getState().data.deckFolders.remote).toBeUndefined();
    expect(saveFolders).toHaveBeenCalledWith(client);
  });

  it("preserves other sync conflicts after deleting a deck", async () => {
    vi.mocked(deckRequests.deleteDeck).mockResolvedValue(undefined);
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({
        decks: {
          remote: makeTestDeck({ id: "remote", source: "account" }),
          conflict: makeTestDeck({
            id: "conflict",
            source: "account",
            version: "2",
          }),
        },
        history: {
          remote: [],
          conflict: [],
        },
      }),
      sync: makeSyncState({
        deckStatus: "conflict",
        deckItems: {
          remote: makeSyncItem(),
          conflict: makeConflictSyncItem({
            version: "2",
            conflict: {
              kind: "update",
              remoteVersion: "3",
            },
          }),
        },
      }),
    });

    await store.getState().deleteDeck(client, "remote");

    expect(store.getState().sync.decks.items.remote).toBeUndefined();
    expect(store.getState().sync.decks.items.conflict).toMatchObject({
      status: "conflict",
    });
    expect(store.getState().sync.decks.status).toBe("conflict");
  });
});
