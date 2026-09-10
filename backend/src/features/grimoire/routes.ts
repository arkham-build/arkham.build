import {
  CardErrataResponseSchema,
  CardFaqResponseSchema,
  GrimoireResponseSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import {
  getAllErrata,
  getAllFaq,
  getAllGrimoireEntries,
  getAllGrimoireSections,
  getErrataForCard,
  getFaqForCard,
} from "../../db/queries/grimoire.ts";
import {
  applyCacheHeaders,
  publicCache,
  requestHasMatchingEtag,
} from "../../lib/cache-headers.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { getDataVersionByLocale } from "../cache/queries.ts";

export const faqRoutes = new Hono<HonoEnv>();
faqRoutes.use("*", publicCache());
faqRoutes.get("/card/:code", async (c) => {
  const data = await getFaqForCard(c.get("db"), c.req.param("code"));
  const faqs = CardFaqResponseSchema.parse(data);
  return c.json(faqs);
});

export const errataRoutes = new Hono<HonoEnv>();
errataRoutes.use("*", publicCache());
errataRoutes.get("/card/:code", async (c) => {
  const data = await getErrataForCard(c.get("db"), c.req.param("code"));
  const errata = CardErrataResponseSchema.parse(data);
  return c.json(errata);
});

export const grimoireRoutes = new Hono<HonoEnv>();
grimoireRoutes.get("/", async (c) => {
  const db = c.get("db");
  const dataVersion = await getDataVersionByLocale(db, "en");
  const etag = `grimoire:${dataVersion.cards_updated_at.valueOf()}`;

  applyCacheHeaders(c, { etag, resource: "grimoire" });

  if (requestHasMatchingEtag(c, etag)) {
    return c.body(null, 304);
  }

  const [entries, errata, faq, sections] = await Promise.all([
    getAllGrimoireEntries(db),
    getAllErrata(db),
    getAllFaq(db),
    getAllGrimoireSections(db),
  ]);

  const data = GrimoireResponseSchema.parse({
    entries,
    errata,
    faq,
    sections,
  });

  return c.json(data);
});
