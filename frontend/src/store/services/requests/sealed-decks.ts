import type { SealedDeckResponse } from "@arkham-build/shared";
import type { HttpClient } from "../http-client";

export async function querySealedDeck(
  client: HttpClient,
  id: string,
): Promise<SealedDeckResponse> {
  const res = await client.request(`/v2/public/sealed-deck/${id}`);
  return await res.json();
}
