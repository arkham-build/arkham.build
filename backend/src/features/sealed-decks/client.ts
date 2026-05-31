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

export type SealedDeckApiResponse = z.infer<typeof SealedDeckApiResponseSchema>;

export async function fetchSealedDeck(id: string) {
  const response = await fetch(`https://www.arkhamsealed.com/cardpool/${id}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "arkham.build",
    },
  });

  if (!response.ok) {
    throw new HTTPException(404, { message: "Sealed deck not found." });
  }

  return SealedDeckApiResponseSchema.parse(await response.json());
}
