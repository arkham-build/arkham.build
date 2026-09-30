import { useQuery } from "@tanstack/react-query";
import { sealedDeckKeys } from "@/queries/keys";
import { useHttpClient } from "@/store/services/http-client.context";
import { querySealedDeck } from "@/store/services/requests/sealed-decks";

export function useSealedDeckQuery(id: string) {
  const client = useHttpClient();

  return useQuery({
    queryKey: sealedDeckKeys.detail(id),
    queryFn: () => querySealedDeck(client, id),
  });
}
