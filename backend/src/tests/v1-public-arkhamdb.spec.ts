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
        const data = decks.get(String(input));
        if (!data) throw new Error(`Unexpected request: ${String(input)}`);
        return Response.json(data);
      }),
    );

    const res = await dependencies.app.request("/v1/public/arkhamdb/deck/123");

    expect(res.status).toBe(200);
    const data = (await res.json()) as { id: number }[];
    expect(data.map((deck) => deck.id)).toEqual([124, 123, 122]);
  });

  test("wraps non-deck responses in an array", async ({ dependencies }) => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
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
