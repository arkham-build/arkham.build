import { HTTPException } from "hono/http-exception";
import { z } from "zod";

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

export async function fetchSealedDeck(id: string) {
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
