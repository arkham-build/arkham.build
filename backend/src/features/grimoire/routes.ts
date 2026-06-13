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
import { publicCache } from "../../lib/cache-headers.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";

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
grimoireRoutes.use("*", publicCache());
grimoireRoutes.get("/", async (c) => {
  const [entries, errata, faq, sections] = await Promise.all([
    getAllGrimoireEntries(c.get("db")),
    getAllErrata(c.get("db")),
    getAllFaq(c.get("db")),
    getAllGrimoireSections(c.get("db")),
  ]);

  const data = GrimoireResponseSchema.parse({
    entries,
    errata,
    faq,
    sections,
  });

  return c.json(data);
});
