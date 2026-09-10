import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  FetchTimeoutError,
  fetchWithTimeout,
} from "../../lib/fetch-with-timeout.ts";

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
  let response: Response;

  try {
    response = await fetchWithTimeout(
      `https://www.arkhamsealed.com/cardpool/${id}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "arkham.build",
        },
      },
    );
  } catch (error) {
    if (error instanceof FetchTimeoutError) {
      throw new HTTPException(500, {
        message: "Sealed deck request timed out.",
      });
    }

    throw error;
  }

  if (!response.ok) {
    throw new HTTPException(404, { message: "Sealed deck not found." });
  }

  return SealedDeckApiResponseSchema.parse(await response.json());
}
