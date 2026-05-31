import {
  type DecklistSearchRequest,
  DecklistSearchRequestSchema,
  decodeSearch,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { statusText } from "../../lib/http-status.ts";
import { findDecklistMetaById, searchDecklists } from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.use("*", async (c, next) => {
  await next();
  if (c.res.status < 300) {
    c.header("Cache-Control", "public, max-age=86400, immutable");
  }
});

routes.get("/search", async (c) => {
  const searchRequest = decodeSearch<DecklistSearchRequest>(
    DecklistSearchRequestSchema,
    c.req.queries(),
  );

  const response = await searchDecklists(c.get("db"), searchRequest);
  return c.json(response);
});

routes.get("/:id/meta", async (c) => {
  const id = c.req.param("id");
  const meta = await findDecklistMetaById(c.get("db"), Number(id));

  if (!meta) {
    throw new HTTPException(404, {
      message: statusText(404),
      cause: `Decklist with ID ${id} not found.`,
    });
  }

  return c.json(meta);
});

export default routes;
