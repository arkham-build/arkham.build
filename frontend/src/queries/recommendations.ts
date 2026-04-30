import type {
  RecommendationsRequest,
  RecommendationsResponse,
} from "@arkham-build/shared";
import { useQuery } from "@tanstack/react-query";
import { recommendationKeys } from "@/queries/keys";
import { useHttpClient } from "@/store/services/http-client.context";
import { getRecommendations } from "@/store/services/requests/recommendations";

export function useRecommendationsQuery(
  request: RecommendationsRequest | null,
  keyParts: readonly unknown[],
) {
  const client = useHttpClient();

  return useQuery<RecommendationsResponse["data"]["recommendations"]>({
    queryKey: recommendationKeys.detail(keyParts),
    queryFn: () => {
      if (!request) {
        return Promise.resolve({ recommendations: [], decks_analyzed: 0 });
      }

      return getRecommendations(client, request);
    },
    retry: false,
  });
}
