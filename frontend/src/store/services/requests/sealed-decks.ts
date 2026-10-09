import {
  type SealedDeckResponse,
  SealedDeckResponseSchema,
} from "@arkham-build/shared";
import type { HttpClient } from "../http-client";

export async function querySealedDeck(
  client: HttpClient,
  id: string,
): Promise<SealedDeckResponse> {
  const res = await client.request(
    `/v2/public/sealed-deck/${encodeURIComponent(id)}`,
  );
  return SealedDeckResponseSchema.parse(await res.json());
}
