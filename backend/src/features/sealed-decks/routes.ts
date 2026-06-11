import { SealedDeckResponseSchema } from "@arkham-build/shared";
import { Hono } from "hono";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { fetchSealedDeck, type SealedDeckApiResponse } from "./client.ts";

const routes = new Hono<HonoEnv>();

routes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const deck = await fetchSealedDeck(id);

  return c.json(mapSealedDeckApiResponseToResponse(id, deck));
});

function mapSealedDeckApiResponseToResponse(
  id: string,
  deck: SealedDeckApiResponse,
) {
  const cards: Record<string, number> = {};

  for (const { code, deckLimit } of [...deck.level0, ...deck.xp]) {
    if (deck.mode === "pack") {
      cards[code] ??= 0;
      cards[code] += 1;
      continue;
    }

    cards[code] = deckLimit;
  }

  return SealedDeckResponseSchema.parse({
    name: id,
    cards,
  });
}

export default routes;
