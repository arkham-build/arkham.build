import { type Context, Hono } from "hono";
import { compress } from "hono/compress";
import type { Database } from "../../db/db.ts";
import {
  applyCacheHeaders,
  type CacheResource,
  requestHasMatchingEtag,
} from "../../lib/cache-headers.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { applyLocaleTranslations, mapCardRowToV1Card } from "./mapping.ts";
import { getDataVersionByLocale } from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.use("*", compress({ threshold: 0 }));
routes.use("*", async (c, next) => {
  await next();
  appendVaryHeader(c.res.headers, "Accept-Encoding");
});

routes.get("/cards", (c) =>
  cachedResponse(c, {
    locale: "en",
    resource: "cards",
    buildResponse: buildCardsResponse,
  }),
);

routes.get("/cards/:locale", (c) =>
  cachedResponse(c, {
    locale: c.req.param("locale"),
    resource: "cards",
    buildResponse: buildCardsResponse,
  }),
);

routes.get("/metadata", (c) =>
  cachedResponse(c, {
    locale: "en",
    resource: "metadata",
    buildResponse: buildMetadataResponse,
  }),
);

routes.get("/metadata/:locale", (c) =>
  cachedResponse(c, {
    locale: c.req.param("locale"),
    resource: "metadata",
    buildResponse: buildMetadataResponse,
  }),
);

routes.get("/version", (c) =>
  cachedResponse(c, {
    locale: "en",
    resource: "version",
    buildResponse: buildVersionResponse,
  }),
);

routes.get("/version/:locale", (c) =>
  cachedResponse(c, {
    locale: c.req.param("locale"),
    resource: "version",
    buildResponse: buildVersionResponse,
  }),
);

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
  const etag = `${options.resource}:${options.locale}:${version.cards_updated_at.valueOf()}:${version.translation_updated_at.valueOf()}`;

  applyCacheHeaders(c, { etag, resource: options.resource });

  return requestHasMatchingEtag(c, etag)
    ? c.body(null, 304)
    : c.json(await options.buildResponse(db, options.locale, version));
}

async function buildCardsResponse(db: Database, locale: string) {
  const cards = await db.selectFrom("card").selectAll().execute();

  const all_card = cards.map((card) =>
    applyLocaleTranslations(mapCardRowToV1Card(card), locale),
  );

  return { data: { all_card } };
}

async function buildMetadataResponse(db: Database, locale: string) {
  const [packs, cycles, encounterSets, tabooSets] = await Promise.all([
    db.selectFrom("pack").selectAll().execute(),
    db.selectFrom("cycle").selectAll().execute(),
    db.selectFrom("encounter_set").selectAll().execute(),
    db.selectFrom("taboo_set").selectAll().execute(),
  ]);

  return {
    data: {
      pack: packs.map((pack) => applyLocaleTranslations(pack, locale)),
      cycle: cycles.map((cycle) => applyLocaleTranslations(cycle, locale)),
      card_encounter_set: encounterSets.map((encounterSet) =>
        applyLocaleTranslations(encounterSet, locale),
      ),
      taboo_set: tabooSets.map((tabooSet) => ({
        id: tabooSet.id,
        card_count: tabooSet.card_count,
        name: tabooSet.name,
        date: tabooSet.date_start,
      })),
    },
  };
}

function buildVersionResponse(
  _db: Database,
  _locale: string,
  version: DataVersion,
) {
  return Promise.resolve({
    data: {
      all_card_updated: [version],
    },
  });
}

function appendVaryHeader(headers: Headers, value: string) {
  const current = headers.get("Vary");
  if (!current) {
    headers.set("Vary", value);
    return;
  }

  const values = current.split(",").map((part) => part.trim().toLowerCase());

  if (!values.includes(value.toLowerCase())) {
    headers.set("Vary", `${current}, ${value}`);
  }
}

export default routes;
