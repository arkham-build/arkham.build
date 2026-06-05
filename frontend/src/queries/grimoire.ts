import { useQuery } from "@tanstack/react-query";
import { grimoireKeys } from "@/queries/keys";
import { useHttpClient } from "@/store/services/http-client.context";
import {
  queryCardErrata,
  queryCardFaq,
  queryGrimoire,
} from "@/store/services/requests/grimoire";

export function useGrimoireQuery(enabled = true) {
  const client = useHttpClient();

  return useQuery({
    queryKey: grimoireKeys.grimoire(),
    queryFn: () => queryGrimoire(client),
    enabled,
  });
}

export function useCardFaqQuery(code: string, enabled = true) {
  const client = useHttpClient();

  return useQuery({
    queryKey: grimoireKeys.cardFaq(code),
    queryFn: () => queryCardFaq(client, code),
    enabled,
  });
}

export function useCardErrataQuery(code: string, enabled = true) {
  const client = useHttpClient();

  return useQuery({
    queryKey: grimoireKeys.cardErrata(code),
    queryFn: () => queryCardErrata(client, code),
    enabled,
  });
}
