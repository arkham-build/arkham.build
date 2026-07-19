import { useQuery } from "@tanstack/react-query";
import { useDataVersionQuery } from "@/queries/cache";
import { grimoireKeys } from "@/queries/keys";
import { useStore } from "@/store";
import { useHttpClient } from "@/store/services/http-client.context";
import {
  queryCardErrata,
  queryCardFaq,
  queryGrimoire,
} from "@/store/services/requests/grimoire";

export function useGrimoireQuery(enabled = true) {
  const client = useHttpClient();
  const locale = useStore((state) => state.settings.locale);
  const localRevision = useStore(
    (state) => state.metadata.dataVersion?.cards_updated_at,
  );
  const dataVersion = useDataVersionQuery(locale, enabled);
  const revision = dataVersion.data?.cards_updated_at ?? localRevision;

  return useQuery({
    queryKey: grimoireKeys.grimoire(revision),
    queryFn: () => queryGrimoire(client, revision),
    enabled: enabled && dataVersion.isFetched,
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
