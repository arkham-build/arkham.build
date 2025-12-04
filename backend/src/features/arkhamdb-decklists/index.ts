import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { statusText } from "../../lib/http-status.ts";
import {
  decklistMetaResponseSchema,
  getDecklistMeta,
} from "./decklist-meta.ts";
import {
  search,
  searchRequestFromQuery,
  searchResponseSchema,
} from "./decklists-search.ts";

export function arkhamDbDecklistsRouter() {
  const routes = new Hono<HonoEnv>();

  routes.use("*", async (c, next) => {
    await next();
    if (c.res.status < 300) {
      c.header("Cache-Control", "public, max-age=86400, immutable");
    }
  });

  routes.get("/search", async (c) => {
    const searchReq = searchRequestFromQuery(c);

    if (!searchReq.success) {
      throw new HTTPException(400, {
        message: statusText(400),
        cause: searchReq.error,
      });
    }

    const res = await search(c.get("db"), searchReq.data);

    return c.json(searchResponseSchema.parse(res));
  });

  routes.get("/:id/meta", async (c) => {
    const id = c.req.param("id");
    const meta = await getDecklistMeta(c.get("db"), Number(id));

    if (!meta) {
      throw new HTTPException(404, {
        message: statusText(404),
        cause: `Decklist with ID ${id} not found.`,
      });
    }

    return c.json(decklistMetaResponseSchema.parse(meta));
  });

  return routes;
}
