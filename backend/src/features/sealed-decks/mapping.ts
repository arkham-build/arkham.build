import {
  type SealedDeckResponse,
  SealedDeckResponseSchema,
} from "@arkham-build/shared";
import type { SealedDeckApiResponse } from "./client.ts";

export function mapSealedDeckApiResponseToResponse(
  id: string,
  deck: SealedDeckApiResponse,
): SealedDeckResponse {
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
