import { describe, expect, vi } from "vitest";
import { test } from "./test-utils.ts";

describe("GET /v1/public/arkhamdb/:type/:id", () => {
  test("returns deck history for deck imports", async ({ dependencies }) => {
    const decks = new Map([
      ["https://arkhamdb.com/api/public/deck/123", deck(123, 122, 124)],
      ["https://arkhamdb.com/api/public/deck/122", deck(122)],
      ["https://arkhamdb.com/api/public/deck/124", deck(124)],
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        // oxlint-disable-next-line typescript/no-base-to-string
        const inputStr = String(input);
        const data = decks.get(inputStr);
        if (!data) throw new Error(`Unexpected request: ${inputStr}`);
        return Response.json(data);
      }),
    );

    const res = await dependencies.app.request("/v1/public/arkhamdb/deck/123");

    expect(res.status).toBe(200);
    const data = (await res.json()) as { id: number }[];
    expect(data.map((deck) => deck.id)).toEqual([124, 123, 122]);
  });

  test("stops resolving deck history when ArkhamDB returns a cycle", async ({
    dependencies,
  }) => {
    const decks = new Map([
      ["https://arkhamdb.com/api/public/deck/123", deck(123, 122, 124)],
      ["https://arkhamdb.com/api/public/deck/122", deck(122, 123)],
      ["https://arkhamdb.com/api/public/deck/124", deck(124)],
    ]);

    const fetchMock = vi.fn((input: string | URL | Request) => {
      // oxlint-disable-next-line typescript/no-base-to-string
      const inputStr = String(input);
      const data = decks.get(inputStr);
      if (!data) throw new Error(`Unexpected request: ${inputStr}`);
      return Response.json(data);
    });

    vi.stubGlobal("fetch", fetchMock);

    const res = await dependencies.app.request("/v1/public/arkhamdb/deck/123");

    expect(res.status).toBe(200);
    const data = (await res.json()) as { id: number }[];
    expect(data.map((deck) => deck.id)).toEqual([124, 123, 122]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("wraps non-deck responses in an array", async ({ dependencies }) => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      // oxlint-disable-next-line typescript/no-base-to-string
      expect(String(input)).toBe(
        "https://arkhamdb.com/api/public/decklist/123",
      );
      return Response.json(deck(123));
    });

    vi.stubGlobal("fetch", fetchMock);

    const res = await dependencies.app.request(
      "/v1/public/arkhamdb/decklist/123",
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([deck(123)]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test("uses cached decklists", async ({ dependencies }) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await dependencies.app.request(
      "/v1/public/arkhamdb/decklist/180",
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{ id: number }>;
    expect(data[0]?.id).toBe(180);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("normalizes invalid ArkhamDB deck meta", async ({ dependencies }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Response.json({ ...deck(123), meta: "{alternate_back:90024}" }),
      ),
    );

    const res = await dependencies.app.request(
      "/v1/public/arkhamdb/decklist/123",
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{ meta: string }>;
    expect(data[0]?.meta).toBe("{}");
  });

  test("preserves ArkhamDB taboo ids", async ({ dependencies }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Response.json({ ...deck(123), taboo_id: 6 })),
    );

    const res = await dependencies.app.request(
      "/v1/public/arkhamdb/decklist/123",
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{ taboo_id: number | null }>;
    expect(data[0]?.taboo_id).toBe(6);
  });
});

function deck(id: number, previousDeck?: number, nextDeck?: number) {
  return {
    date_creation: "2026-01-01T00:00:00Z",
    date_update: "2026-01-01T00:00:00Z",
    description_md: "",
    exile_string: null,
    id,
    ignoreDeckLimitSlots: null,
    investigator_code: "01001",
    investigator_name: "Roland Banks",
    meta: "{}",
    name: `Deck ${id}`,
    next_deck: nextDeck ?? null,
    previous_deck: previousDeck ?? null,
    sideSlots: null,
    slots: { "01001": 1 },
    taboo: null,
    tags: "",
    user_id: null,
    version: "1.0",
    xp: null,
    xp_adjustment: null,
    xp_spent: null,
  };
}
