import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreApi } from "zustand";
import { makeDeck } from "@/store/lib/deck-factory";
import type { Deck } from "@/store/schemas/deck.schema";
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
});

function setAuthenticated(store: StoreApi<StoreState>) {
  store.setState({
    auth: {
      status: "authenticated",
      session: {
        account: { id: "account-id", name: "user" },
        identities: [],
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
