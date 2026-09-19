import { describe, expect } from "vitest";
import { serializeRecords } from "../db/db.helpers.ts";
import { test } from "./test-utils.ts";

type MetadataResponse = {
  data: {
    campaign: {
      campaign_guide_url?: string;
      code: string;
      cycle_code: string;
      name?: string;
      real_campaign_guide_url: string | null;
      real_name: string;
      translations?: unknown[];
      variant_of_code: string | null;
    }[];
    pack: {
      code: string;
      real_name: string;
    }[];
    scenario: {
      campaign_guide_location?: number | null;
      code: string;
      name?: string;
      real_campaign_guide_location: number | null;
      real_name: string;
      real_rules_insert_url: string | null;
      rules_insert_url?: string;
      translations?: unknown[];
      variant_of_code: string | null;
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

  test("keeps the version edge cache short", async ({ dependencies }) => {
    const res = await dependencies.app.request("/v1/cache/version/en");

    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=0, must-revalidate",
    );
    expect(res.headers.get("Cloudflare-CDN-Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=0",
    );
    expect(res.headers.get("Cache-Tag")).toBe("cache,version");
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

  test("returns source guide metadata for English", async ({
    dependencies,
  }) => {
    await dependencies.db
      .insertInto("campaign")
      .values(
        serializeRecords([
          {
            campaign_guide_url: "https://example.com/source-guide.pdf",
            code: "cache_english",
            cycle_code: "core",
            name: "Source Campaign",
            translations: [
              {
                campaign_guide_url: "https://example.com/de-guide.pdf",
                locale: "de",
                name: "Translated Campaign",
              },
            ],
          },
        ]),
      )
      .execute();
    await dependencies.db
      .insertInto("scenario")
      .values(
        serializeRecords([
          {
            campaign_code: "cache_english",
            campaign_guide_location: 4,
            code: "cache_english_1",
            name: "Source Scenario",
            rules_insert_url: "https://example.com/source-rules.pdf",
            translations: [
              {
                campaign_guide_location: 6,
                locale: "de",
                name: "Translated Scenario",
                rules_insert_url: "https://example.com/de-rules.pdf",
              },
            ],
          },
        ]),
      )
      .execute();

    const res = await dependencies.app.request("/v1/cache/metadata");
    const json = (await res.json()) as MetadataResponse;
    const campaign = findCampaign(json, "cache_english");
    const scenario = findScenario(json, "cache_english_1");

    expect(campaign).toMatchObject({
      real_campaign_guide_url: "https://example.com/source-guide.pdf",
      real_name: "Source Campaign",
    });
    expect(campaign).not.toHaveProperty("campaign_guide_url");
    expect(campaign).not.toHaveProperty("name");
    expect(campaign).not.toHaveProperty("translations");

    expect(scenario).toMatchObject({
      real_campaign_guide_location: 4,
      real_name: "Source Scenario",
      real_rules_insert_url: "https://example.com/source-rules.pdf",
    });
    expect(scenario).not.toHaveProperty("campaign_guide_location");
    expect(scenario).not.toHaveProperty("name");
    expect(scenario).not.toHaveProperty("rules_insert_url");
    expect(scenario).not.toHaveProperty("translations");
  });

  test("returns localized guide metadata with source fallbacks", async ({
    dependencies,
  }) => {
    await dependencies.db
      .insertInto("campaign")
      .values(
        serializeRecords([
          {
            campaign_guide_url: "https://example.com/source-full-guide.pdf",
            code: "cache_full",
            cycle_code: "core",
            name: "Full Source Campaign",
            translations: [
              {
                campaign_guide_url: "https://example.com/de-full-guide.pdf",
                locale: "de",
                name: "Full Translated Campaign",
              },
            ],
          },
          {
            campaign_guide_url: "https://example.com/source-partial-guide.pdf",
            code: "cache_partial",
            cycle_code: "core",
            name: "Partial Source Campaign",
            translations: [{ locale: "de", name: "Partial Translation" }],
          },
        ]),
      )
      .execute();
    await dependencies.db
      .insertInto("scenario")
      .values(
        serializeRecords([
          {
            campaign_code: "cache_full",
            campaign_guide_location: 4,
            code: "cache_full_1",
            name: "Full Source Scenario",
            rules_insert_url: "https://example.com/source-full-rules.pdf",
            translations: [
              {
                campaign_guide_location: 6,
                locale: "de",
                name: "Full Translated Scenario",
                rules_insert_url: "https://example.com/de-full-rules.pdf",
              },
            ],
          },
          {
            campaign_code: "cache_partial",
            campaign_guide_location: 8,
            code: "cache_partial_1",
            name: "Partial Source Scenario",
            rules_insert_url: "https://example.com/source-partial-rules.pdf",
            translations: [{ campaign_guide_location: null, locale: "de" }],
          },
        ]),
      )
      .execute();

    const res = await dependencies.app.request("/v1/cache/metadata/de");
    const json = (await res.json()) as MetadataResponse;
    const fullCampaign = findCampaign(json, "cache_full");
    const partialCampaign = findCampaign(json, "cache_partial");
    const fullScenario = findScenario(json, "cache_full_1");
    const partialScenario = findScenario(json, "cache_partial_1");

    expect(fullCampaign).toMatchObject({
      campaign_guide_url: "https://example.com/de-full-guide.pdf",
      name: "Full Translated Campaign",
      real_campaign_guide_url: "https://example.com/source-full-guide.pdf",
      real_name: "Full Source Campaign",
    });
    expect(fullCampaign).not.toHaveProperty("translations");

    expect(partialCampaign).toMatchObject({
      name: "Partial Translation",
      real_campaign_guide_url: "https://example.com/source-partial-guide.pdf",
      real_name: "Partial Source Campaign",
    });
    expect(partialCampaign).not.toHaveProperty("campaign_guide_url");
    expect(partialCampaign).not.toHaveProperty("translations");

    expect(fullScenario).toMatchObject({
      campaign_guide_location: 6,
      name: "Full Translated Scenario",
      real_campaign_guide_location: 4,
      real_name: "Full Source Scenario",
      real_rules_insert_url: "https://example.com/source-full-rules.pdf",
      rules_insert_url: "https://example.com/de-full-rules.pdf",
    });
    expect(fullScenario).not.toHaveProperty("translations");

    expect(partialScenario).toMatchObject({
      campaign_guide_location: null,
      real_campaign_guide_location: 8,
      real_name: "Partial Source Scenario",
      real_rules_insert_url: "https://example.com/source-partial-rules.pdf",
    });
    expect(partialScenario).not.toHaveProperty("name");
    expect(partialScenario).not.toHaveProperty("rules_insert_url");
    expect(partialScenario).not.toHaveProperty("translations");
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

function findCampaign(response: MetadataResponse, code: string) {
  const campaign = response.data.campaign.find(
    (campaign) => campaign.code === code,
  );
  if (!campaign) throw new Error(`Campaign not found: ${code}`);
  return campaign;
}

function findScenario(response: MetadataResponse, code: string) {
  const scenario = response.data.scenario.find(
    (scenario) => scenario.code === code,
  );
  if (!scenario) throw new Error(`Scenario not found: ${code}`);
  return scenario;
}
