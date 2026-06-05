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
import type { HonoEnv } from "../../lib/hono-env.ts";

const routes = new Hono<HonoEnv>();

routes.get("/faq/card/:code", async (c) => {
  const data = await getFaqForCard(c.get("db"), c.req.param("code"));
  const faqs = CardFaqResponseSchema.parse(data);
  c.header("Cache-Control", "public, max-age=86400");
  return c.json(faqs);
});

routes.get("/errata/card/:code", async (c) => {
  const data = await getErrataForCard(c.get("db"), c.req.param("code"));
  const errata = CardErrataResponseSchema.parse(data);
  c.header("Cache-Control", "public, max-age=86400");
  return c.json(errata);
});

routes.get("/grimoire", async (c) => {
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

  c.header("Cache-Control", "public, max-age=86400");
  return c.json(data);
});

export default routes;
