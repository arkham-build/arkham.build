import {
  type DecklistMetaResponse,
  DecklistMetaResponseSchema,
} from "@arkham-build/shared";
import type { HttpClient } from "../http-client";
import { ApiError } from "./shared";

export async function fetchArkhamDBDecklistMeta(
  client: HttpClient,
  id: number,
): Promise<DecklistMetaResponse | undefined> {
  try {
    const res = await client.request(
      `/v2/public/arkhamdb-decklists/${id}/meta`,
    );

    const json = await res.json();

    return DecklistMetaResponseSchema.parse(json);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return undefined;
    }

    throw error;
  }
}
