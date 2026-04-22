import { type Context, Hono } from "hono";
import { compress } from "hono/compress";
import type { Database } from "../db/db.ts";
import {
  applyCacheHeaders,
  type CacheResource,
  requestHasMatchingEtag,
} from "../lib/cache-headers.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import {
  applyTranslations,
  formatAsLegacyApiCard,
  getVersionForLocale,
} from "./cache.helpers.ts";

const router = new Hono<HonoEnv>();

router.use("*", compress({ threshold: 0 }));
router.use("*", async (_c, next) => {
  await next();
  appendVaryHeader(_c.res.headers, "Accept-Encoding");
});

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

type DataVersion = Awaited<ReturnType<typeof getVersionForLocale>>;

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
  const version = await getVersionForLocale(db, options.locale);
  const etag = `${options.resource}:${options.locale}:${version.ingested_commit_id}`;

  applyCacheHeaders(c, { etag, resource: options.resource });

  return requestHasMatchingEtag(c, etag)
    ? c.body(null, 304)
    : c.json(await options.buildResponse(db, options.locale, version));
}

async function cardsResponse(db: Database, locale: string) {
  const cards = await db.selectFrom("card").selectAll().execute();

  const all_card = cards.map((c) =>
    applyTranslations(formatAsLegacyApiCard(c), locale),
  );

  return { data: { all_card } };
}

async function metadataResponse(db: Database, locale: string) {
  const [packs, cycles, encounterSets, tabooSets] = await Promise.all([
    db.selectFrom("pack").selectAll().execute(),
    db.selectFrom("cycle").selectAll().execute(),
    db.selectFrom("encounter_set").selectAll().execute(),
    db.selectFrom("taboo_set").selectAll().execute(),
  ]);

  return {
    data: {
      pack: packs.map((p) => applyTranslations(p, locale)),
      cycle: cycles.map((c) => applyTranslations(c, locale)),
      card_encounter_set: encounterSets.map((es) =>
        applyTranslations(es, locale),
      ),
      taboo_set: tabooSets.map((t) => ({
        id: t.id,
        card_count: t.card_count,
        name: t.name,
        date: t.date_start,
      })),
    },
  };
}

function versionResponse(_db: Database, _locale: string, version: DataVersion) {
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
