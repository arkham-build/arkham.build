import { SealedDeckResponseSchema } from "@arkham-build/shared";
import { Hono } from "hono";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { fetchSealedDeck } from "./queries.ts";

const routes = new Hono<HonoEnv>();

routes.get("/:id", async (c) => {
  const id = c.req.param("id");

  const data = await fetchSealedDeck(id);
  const mode = data.mode;

  const name = id;
  const cards: Record<string, number> = {};

  for (const { code, deckLimit } of [...data.level0, ...data.xp]) {
    if (mode === "pack") {
      cards[code] ??= 0;
      cards[code] += 1;
    } else {
      cards[code] = deckLimit;
    }
  }

  return c.json(SealedDeckResponseSchema.parse({ name, cards }));
});

export default routes;
