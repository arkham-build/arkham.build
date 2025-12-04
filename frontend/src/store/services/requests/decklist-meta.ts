import { apiV2Request } from "./shared";

type ArkhamDBDecklistMetaResponse = {
  date_creation: string;
  description_word_count: number;
  like_count: number;
  user_id: number;
  user_name: string;
  user_reputation: string;
};

export async function fetchArkhamDBDecklistMeta(id: number) {
  const res = await apiV2Request(`/v2/public/arkhamdb-decklists/${id}/meta`);

  if (res.status === 404) return undefined;

  if (!res.ok) {
    throw new Error(`Failed to fetch decklist meta: ${res.statusText}`);
  }

  return (await res.json()) as ArkhamDBDecklistMetaResponse;
}
