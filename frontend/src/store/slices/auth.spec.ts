import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHttpClient } from "@/store/services/http-client";
import { getMockStore } from "@/test/get-mock-store";

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

  it("clears the stored session after an unauthorized session refresh", async () => {
    const store = await getMockStore();

    store.setState({
      auth: {
        session: {
          account: {
            email: "test@example.com",
            id: "account-id",
            name: "Test User",
          },
        },
        status: "authenticated",
      },
      sync: {
        settings: {
          accountId: "account-id",
          revision: "1",
          lastSyncedAt: Date.now(),
          status: "synced",
          error: null,
          conflict: null,
        },
        decks: {
          accountId: "account-id",
          manifestVersion: "1",
          lastSyncedAt: Date.now(),
          status: "synced",
          error: null,
          items: {},
        },
      },
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    store.getState().setHttpClient(
      createHttpClient({
        apiUrl: "http://localhost",
        onUnauthorized: () => store.getState().handleUnauthorized(),
      }),
    );

    await store.getState().initSession();

    expect(store.getState().auth).toEqual({
      session: null,
      status: "unauthenticated",
    });
    expect(store.getState().sync.settings.accountId).toBeNull();
    expect(store.getState().sync.decks.accountId).toBeNull();
  });
});
