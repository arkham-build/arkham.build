import { STATUS_CODES } from "node:http";
import {
  type DecklistSearchRequest,
  DecklistSearchRequestSchema,
  decodeSearch,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { publicCache } from "../../lib/cache-headers.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { findDecklistMetaById, searchDecklists } from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.use("*", publicCache(86400, true));

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
      message: STATUS_CODES[404] as string,
      cause: `Decklist with ID ${id} not found.`,
    });
  }

  return c.json(meta);
});

export default routes;
