import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

type MetadataResponse = {
  data: {
    pack: {
      code: string;
      real_name: string;
    }[];
  };
};

type TabooSetsWithCardsResponse = {
  data: {
    taboo_set: {
      cards: Record<string, unknown>[];
    }[];
  };
};

describe("GET /v1/cache", () => {
  test("returns 304 for matching etags", async ({ dependencies }) => {
    const initialRes = await dependencies.app.request("/v1/cache/metadata");
    const etag = initialRes.headers.get("ETag");

    expect(etag).toBeTruthy();

    const res = await dependencies.app.request("/v1/cache/metadata", {
      headers: {
        // oxlint-disable-next-line typescript/no-non-null-assertion -- test code.
        "If-None-Match": etag!,
      },
    });

    expect(res.status).toBe(304);
    expect(res.headers.get("ETag")).toBe(etag);
    expect(await res.text()).toBe("");
  });

  test("caches responses until the data version changes", async ({
    dependencies,
  }) => {
    const initialRes = await dependencies.app.request("/v1/cache/metadata");
    const initialJson = (await initialRes.json()) as MetadataResponse;

    expect(packName(initialJson, "core")).toBe("Core Set");

    await dependencies.db
      .updateTable("pack")
      .set({ name: "Changed Core Set" })
      .where("code", "=", "core")
      .execute();

    const cachedRes = await dependencies.app.request("/v1/cache/metadata");
    const cachedJson = (await cachedRes.json()) as MetadataResponse;

    expect(packName(cachedJson, "core")).toBe("Core Set");

    await dependencies.db
      .updateTable("data_version")
      .set({ cards_updated_at: new Date("2028-01-01T00:00:00.000Z") })
      .where("locale", "=", "en")
      .execute();

    const refreshedRes = await dependencies.app.request("/v1/cache/metadata");
    const refreshedJson = (await refreshedRes.json()) as MetadataResponse;

    expect(packName(refreshedJson, "core")).toBe("Changed Core Set");
  });

  test("returns compact taboo set cards", async ({ dependencies }) => {
    const res = await dependencies.app.request(
      "/v1/cache/taboo_sets_with_cards",
    );
    const json = (await res.json()) as TabooSetsWithCardsResponse;
    const firstCard = json.data.taboo_set[0]?.cards[0];

    expect(firstCard).toBeTruthy();
    expect(Object.keys(firstCard ?? {}).sort()).toEqual(["code", "real_name"]);
  });
});

function packName(response: MetadataResponse, code: string) {
  const pack = response.data.pack.find((pack) => pack.code === code);
  if (!pack) throw new Error(`Pack not found: ${code}`);
  return pack.real_name;
}
