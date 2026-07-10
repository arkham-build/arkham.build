import type { Deck } from "@arkham-build/shared";
import { describe, expect, vi } from "vitest";
import { test } from "./test-utils.ts";

describe("legacy proxy", () => {
  test("serves starter decks without proxying", async ({ dependencies }) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await dependencies.app.request("/v1/public/share/2624931");

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: number };
    expect(body.id).toBe(2624931);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("proxies missing shares from the legacy api", async ({
    dependencies,
  }) => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      // oxlint-disable-next-line typescript/no-base-to-string
      expect(String(input)).toBe(
        "http://localhost:8787/v1/public/share/legacy-share",
      );
      return new Response("legacy share", {
        headers: { "Content-Type": "text/plain", "X-Upstream": "proxied" },
        status: 202,
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    const res = await dependencies.app.request("/v1/public/share/legacy-share");

    expect(res.status).toBe(202);
    expect(res.headers.get("x-upstream")).toBe("proxied");
    expect(await res.text()).toBe("legacy share");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test("converts missing share history from the legacy api", async ({
    dependencies,
  }) => {
    const legacyDeck = createDeck("legacy-share");
    const fetchMock = vi.fn((input: string | URL | Request) => {
      // oxlint-disable-next-line typescript/no-base-to-string
      expect(String(input)).toBe(
        "http://localhost:8787/v1/public/share_history/legacy-share",
      );
      return Response.json({ data: legacyDeck, history: [] });
    });

    vi.stubGlobal("fetch", fetchMock);

    const res = await dependencies.app.request(
      "/v1/public/share_history/legacy-share",
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([legacyDeck]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

function createDeck(id: string): Deck {
  return {
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-01T00:00:00.000Z",
    description_md: "",
    exile_string: null,
    id,
    ignoreDeckLimitSlots: null,
    investigator_code: "01001",
    investigator_name: "Roland Banks",
    meta: "{}",
    name: "Legacy Share",
    next_deck: null,
    previous_deck: null,
    problem: null,
    sideSlots: null,
    slots: { "01001": 1 },
    source: "shared",
    taboo_id: null,
    tags: "",
    user_id: null,
    version: "1.0",
    xp: null,
    xp_adjustment: null,
    xp_spent: null,
  };
}
