import {
  encodeSearch,
  type RecommendationsRequest,
  type RecommendationsResponse,
  RecommendationsResponseSchema,
} from "@arkham-build/shared";
import type { HttpClient } from "../http-client";

export async function getRecommendations(
  client: HttpClient,
  req: RecommendationsRequest,
): Promise<RecommendationsResponse["data"]["recommendations"]> {
  const search = encodeSearch(req).toString();

  const res = await client.request(
    `/v2/public/recommendations/${req.canonical_investigator_code}?${search}`,
    {
      method: "GET",
    },
  );

  const json = await res.json();
  return RecommendationsResponseSchema.parse(json).data.recommendations;
}
