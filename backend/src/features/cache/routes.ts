import type { JsonDataScenario } from "@arkham-build/shared";
import { type Context, Hono } from "hono";
import type { Selectable } from "kysely";
import type { Database } from "../../db/db.ts";
import type {
  CampaignScenario,
  ScenarioEncounterSet,
  ScenarioEncounterSetCard,
} from "../../db/schema.types.ts";
import {
  applyCacheHeaders,
  type CacheResource,
  requestHasMatchingEtag,
} from "../../lib/cache-headers.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { applyLocaleTranslations, mapCardRowToV1Card } from "./mapping.ts";
import { getDataVersionByLocale } from "./queries.ts";

const router = new Hono<HonoEnv>();

const METADATA_VERSION = 2;

router.get("/cards", (c) =>
  cachedResponse(c, {
    locale: "en",
    resource: "cards",
    buildResponse: cardsResponse,
  }),
);

router.get("/cards/:locale", (c) =>
  cachedResponse(c, {
    locale: c.req.param("locale"),
    resource: "cards",
    buildResponse: cardsResponse,
  }),
);

router.get("/metadata", (c) =>
  cachedResponse(c, {
    locale: "en",
    resource: "metadata",
    buildResponse: metadataResponse,
  }),
);

router.get("/metadata/:locale", (c) =>
  cachedResponse(c, {
    locale: c.req.param("locale"),
    resource: "metadata",
    buildResponse: metadataResponse,
  }),
);

router.get("/version", (c) =>
  cachedResponse(c, {
    locale: "en",
    resource: "version",
    buildResponse: versionResponse,
  }),
);

router.get("/version/:locale", (c) =>
  cachedResponse(c, {
    locale: c.req.param("locale"),
    resource: "version",
    buildResponse: versionResponse,
  }),
);

export default router;

type DataVersion = Awaited<ReturnType<typeof getDataVersionByLocale>>;

type CachedResponseOptions<T> = {
  locale: string;
  resource: CacheResource;
  buildResponse: (
    db: Database,
    locale: string,
    version: DataVersion,
  ) => Promise<T>;
};

async function cachedResponse<T>(
  c: Context<HonoEnv>,
  options: CachedResponseOptions<T>,
) {
  const db = c.get("db");
  const version = await getDataVersionByLocale(db, options.locale);
  const etagParts = [
    options.resource,
    options.locale,
    version.cards_updated_at.valueOf(),
    version.translation_updated_at.valueOf(),
  ];

  if (options.resource !== "cards") {
    etagParts.push(METADATA_VERSION);
  }

  const etag = etagParts.join(":");

  applyCacheHeaders(c, { etag, resource: options.resource });

  return requestHasMatchingEtag(c, etag)
    ? c.body(null, 304)
    : c.json(await options.buildResponse(db, options.locale, version));
}

async function cardsResponse(db: Database, locale: string) {
  const cards = await db.selectFrom("card").selectAll().execute();

  const all_card = cards.map((c) =>
    applyLocaleTranslations(mapCardRowToV1Card(c), locale),
  );

  return { data: { all_card } };
}

async function metadataResponse(db: Database, locale: string) {
  const [
    packs,
    cycles,
    encounterSets,
    tabooSets,
    campaigns,
    campaignScenarios,
    scenarios,
    scenarioEncounterSets,
    scenarioEncounterSetCards,
    rulesVersions,
  ] = await Promise.all([
    db.selectFrom("pack").selectAll().execute(),
    db.selectFrom("cycle").selectAll().execute(),
    db.selectFrom("encounter_set").selectAll().execute(),
    db.selectFrom("taboo_set").selectAll().execute(),
    db.selectFrom("campaign").selectAll().execute(),
    db.selectFrom("campaign_scenario").selectAll().execute(),
    db.selectFrom("scenario").selectAll().execute(),
    db.selectFrom("scenario_encounter_set").selectAll().execute(),
    db.selectFrom("scenario_encounter_set_card").selectAll().execute(),
    db.selectFrom("rules_version").selectAll().orderBy("date").execute(),
  ]);

  const scenarioCodesByCampaign =
    groupScenarioCodesByCampaign(campaignScenarios);

  const cardIdsByScenarioEncounterSet = groupCardIdsByScenarioEncounterSet(
    scenarioEncounterSetCards,
  );

  const encounterSetsByScenario = groupEncounterSetsByScenario(
    scenarioEncounterSets,
    cardIdsByScenarioEncounterSet,
  );

  return {
    data: {
      pack: packs.map((p) => applyLocaleTranslations(p, locale)),
      cycle: cycles.map((c) => applyLocaleTranslations(c, locale)),
      card_encounter_set: encounterSets.map((es) =>
        applyLocaleTranslations(es, locale),
      ),
      taboo_set: tabooSets.map((t) => ({
        id: t.id,
        card_count: t.card_count,
        name: t.name,
        date: t.date_start,
      })),
      campaign: campaigns.map((campaign) =>
        applyLocaleTranslations(
          {
            ...campaign,
            scenarios: scenarioCodesByCampaign[campaign.code] ?? [],
          },
          locale,
        ),
      ),
      scenario: scenarios.map((scenario) =>
        applyLocaleTranslations(
          {
            ...scenario,
            encounter_sets: encounterSetsByScenario[scenario.code] ?? [],
          },
          locale,
        ),
      ),
      rules_versions: rulesVersions.map((version) => ({
        citation: version.citation,
        date: new Date(version.date).toISOString().slice(0, 10),
      })),
    },
  };
}

function versionResponse(_db: Database, _locale: string, version: DataVersion) {
  return Promise.resolve({
    data: {
      all_card_updated: [
        {
          ...version,
          metadata_version: METADATA_VERSION,
        },
      ],
    },
  });
}

function groupScenarioCodesByCampaign(records: Selectable<CampaignScenario>[]) {
  return records
    .toSorted((a, b) => a.position - b.position)
    .reduce<Record<string, string[]>>((acc, curr) => {
      const scenarios = acc[curr.campaign_code] ?? [];
      scenarios.push(curr.scenario_code);
      acc[curr.campaign_code] = scenarios;
      return acc;
    }, {});
}

type CardIdsByScenarioEncounterSet = Record<string, Record<string, string[]>>;

function groupCardIdsByScenarioEncounterSet(
  records: Selectable<ScenarioEncounterSetCard>[],
) {
  return records
    .toSorted((a, b) => a.position - b.position)
    .reduce<CardIdsByScenarioEncounterSet>((acc, curr) => {
      const encounterSets = acc[curr.scenario_code] ?? {};
      const cards = encounterSets[curr.encounter_code] ?? [];
      cards.push(curr.card_id);
      encounterSets[curr.encounter_code] = cards;
      acc[curr.scenario_code] = encounterSets;
      return acc;
    }, {});
}

function groupEncounterSetsByScenario(
  records: Selectable<ScenarioEncounterSet>[],
  cardIdsByScenarioEncounterSet: CardIdsByScenarioEncounterSet,
) {
  return records
    .toSorted((a, b) => a.position - b.position)
    .reduce<Record<string, JsonDataScenario["encounter_sets"]>>((acc, curr) => {
      const cards =
        cardIdsByScenarioEncounterSet[curr.scenario_code]?.[
          curr.encounter_code
        ];
      const encounterSet: JsonDataScenario["encounter_sets"][number] = {
        code: curr.encounter_code,
      };

      if (cards?.length) {
        encounterSet.cards = cards;
      }

      const encounterSets = acc[curr.scenario_code] ?? [];
      encounterSets.push(encounterSet);
      acc[curr.scenario_code] = encounterSets;
      return acc;
    }, {});
}
