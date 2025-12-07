import {
  type DecklistMetaResponse,
  DecklistMetaResponseSchema,
} from "@arkham-build/shared";
import { apiV2Request } from "./shared";

export async function fetchArkhamDBDecklistMeta(
  id: number,
): Promise<DecklistMetaResponse | undefined> {
  const res = await apiV2Request(`/v2/public/arkhamdb-decklists/${id}/meta`);

  if (res.status === 404) return undefined;

  if (!res.ok) {
    throw new Error(`Failed to fetch decklist meta: ${res.statusText}`);
  }

  const json = await res.json();

  return DecklistMetaResponseSchema.parse(json);
}
