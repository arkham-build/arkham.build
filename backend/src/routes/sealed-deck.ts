import { SealedDeckResponseSchema } from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { HonoEnv } from "../lib/hono-env.ts";

const router = new Hono<HonoEnv>();

router.get("/:id", async (c) => {
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

const SealedDeckApiResponseSchema = z.object({
  mode: z.enum(["pack", "pool"]),
  xp: z.array(
    z.object({
      code: z.string(),
      deckLimit: z.number(),
    }),
  ),
  level0: z.array(
    z.object({
      code: z.string(),
      deckLimit: z.number(),
    }),
  ),
});

async function fetchSealedDeck(id: string) {
  const res = await fetch(`https://www.arkhamsealed.com/cardpool/${id}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "arkham.build",
    },
  });

  if (!res.ok) {
    throw new HTTPException(404, { message: "Sealed deck not found." });
  }

  const data = SealedDeckApiResponseSchema.parse(await res.json());
  return data;
}

export default router;
