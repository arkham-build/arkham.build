import { Hono } from "hono";
import type { Database } from "../db/db.ts";
import { applyCacheHeaders } from "../lib/cache-headers.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import {
  applyTranslations,
  formatAsLegacyApiCard,
  getVersionForLocale,
} from "./cache.helpers.ts";

const router = new Hono<HonoEnv>();

router.get("/cards", async (c) => {
  const { res, etag } = await cardsResponse(c.get("db"), "en");
  applyCacheHeaders(c, { etag, resource: "cards" });
  return c.json(res);
});

router.get("/cards/:locale", async (c) => {
  const { res, etag } = await cardsResponse(c.get("db"), c.req.param("locale"));
  applyCacheHeaders(c, { etag, resource: "cards" });
  return c.json(res);
});

async function cardsResponse(db: Database, locale: string) {
  const [cards, dataVersion] = await Promise.all([
    db.selectFrom("card").selectAll().execute(),
    getVersionForLocale(db, locale),
  ]);

  const all_card = cards.map((c) =>
    applyTranslations(formatAsLegacyApiCard(c), locale),
  );

  return {
    res: { data: { all_card } },
    etag: `cards:${locale}:${dataVersion.ingested_commit_id}`,
  };
}

router.get("/metadata", async (c) => {
  const { etag, res } = await metadataResponse(c.get("db"), "en");
  applyCacheHeaders(c, { etag, resource: "metadata" });
  return c.json(res);
});

router.get("/metadata/:locale", async (c) => {
  const { etag, res } = await metadataResponse(
    c.get("db"),
    c.req.param("locale"),
  );
  applyCacheHeaders(c, { etag, resource: "metadata" });
  return c.json(res);
});

async function metadataResponse(db: Database, locale: string) {
  const [packs, cycles, encounterSets, tabooSets, dataVersion] =
    await Promise.all([
      db.selectFrom("pack").selectAll().execute(),
      db.selectFrom("cycle").selectAll().execute(),
      db.selectFrom("encounter_set").selectAll().execute(),
      db.selectFrom("taboo_set").selectAll().execute(),
      getVersionForLocale(db, locale),
    ]);

  const res = {
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

  return {
    res,
    etag: `metadata:${locale}:${dataVersion.ingested_commit_id}`,
  };
}

router.get("/version", async (c) => {
  const { res, etag } = await versionResponse(c.get("db"), "en");
  applyCacheHeaders(c, { etag, resource: "version" });
  return c.json(res);
});

router.get("/version/:locale", async (c) => {
  const { res, etag } = await versionResponse(
    c.get("db"),
    c.req.param("locale"),
  );
  applyCacheHeaders(c, { etag, resource: "version" });
  return c.json(res);
});

async function versionResponse(db: Database, locale: string) {
  const version = await getVersionForLocale(db, locale);

  return {
    res: {
      data: {
        all_card_updated: [version],
      },
    },
    etag: `version:${locale}:${version.ingested_commit_id}`,
  };
}

export default router;
