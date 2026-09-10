import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHttpClient } from "@/store/services/http-client";
import {
  makeAuthenticatedAuth,
  makeData,
  makeSyncItem,
  makeSyncState,
  makeTestDeck,
} from "@/test/factories";
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
      auth: makeAuthenticatedAuth(),
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
      sync: makeSyncState({ deckItems: { remote: makeSyncItem() } }),
    });

    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await store.getState().logout(getMockHttpClient());

    expect(store.getState().auth).toEqual({ session: null, status: "idle" });
    expect(store.getState().data.decks.remote).toBeUndefined();
    expect(store.getState().data.decks.local).toBeDefined();
    expect(store.getState().deckEdits.remote).toBeUndefined();
    expect(store.getState().sync.settings.accountId).toBeNull();
    expect(store.getState().sync.decks.accountId).toBeNull();
    expect(store.getState().sync.folders.accountId).toBeNull();
  });

  it("preserves local folder membership on logout", async () => {
    const store = await getMockStore();

    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({
        decks: {
          local: makeTestDeck({ id: "local" }),
          remote: makeTestDeck({ id: "remote", source: "account" }),
        },
        folders: {
          folder: { id: "folder", name: "Folder" },
        },
        deckFolders: {
          local: "folder",
          remote: "folder",
        },
        history: {
          local: [],
          remote: [],
        },
      }),
      sync: makeSyncState({ deckItems: { remote: makeSyncItem() } }),
    });

    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await store.getState().logout(getMockHttpClient());

    expect(store.getState().data.folders.folder).toEqual({
      id: "folder",
      name: "Folder",
    });
    expect(store.getState().data.deckFolders.local).toBe("folder");
    expect(store.getState().data.deckFolders.remote).toBeUndefined();
  });

  it("clears the stored session after an unauthorized session refresh", async () => {
    const store = await getMockStore();

    store.setState({
      auth: makeAuthenticatedAuth(),
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
      sync: makeSyncState({ deckItems: { remote: makeSyncItem() } }),
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
    expect(store.getState().sync.settings.accountId).toBeNull();
    expect(store.getState().sync.decks.accountId).toBeNull();
    expect(store.getState().sync.folders.accountId).toBeNull();
  });
});
