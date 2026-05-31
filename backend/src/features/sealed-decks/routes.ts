import { Hono } from "hono";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { fetchSealedDeck } from "./client.ts";
import { mapSealedDeckApiResponseToResponse } from "./mapping.ts";

const routes = new Hono<HonoEnv>();

routes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const deck = await fetchSealedDeck(id);

  return c.json(mapSealedDeckApiResponseToResponse(id, deck));
});

export default routes;
