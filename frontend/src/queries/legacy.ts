import { useQuery } from "@tanstack/react-query";
import { legacyKeys } from "@/queries/keys";
import { useStore } from "@/store";
import { providerAdapters } from "@/store/lib/provider-adapters";
import { useHttpClient } from "@/store/services/http-client.context";
import { getShare, queryDeck } from "@/store/services/requests/public-decks";

export function useShareQuery(id: string) {
  const client = useHttpClient();
  const cacheFanMadeContent = useStore((state) => state.cacheFanMadeContent);

  return useQuery({
    queryKey: legacyKeys.share(id),
    queryFn: async () => {
      const decks = await getShare(client, id);
      cacheFanMadeContent(decks);
      return decks;
    },
  });
}

export function useArkhamDbDeckQuery(type: string, id: number) {
  const client = useHttpClient();
  const cacheFanMadeContent = useStore((state) => state.cacheFanMadeContent);

  return useQuery({
    queryKey: legacyKeys.deck(type, id),
    queryFn: async () => {
      const decks = await queryDeck(client, type, id);
      cacheFanMadeContent(decks);
      const adapter = new providerAdapters.arkhamdb(useStore.getState);
      return decks.map((deck) => adapter.in(deck));
    },
    enabled: !Number.isNaN(id),
  });
}
