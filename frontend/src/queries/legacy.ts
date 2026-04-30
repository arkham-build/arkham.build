import { useQuery } from "@tanstack/react-query";
import { legacyKeys } from "@/queries/keys";
import { useStore } from "@/store";
import { providerAdapters } from "@/store/lib/provider-adapters";
import { selectClientId } from "@/store/selectors/shared";
import {
  getShare,
  queryDeck,
  queryFaq,
} from "@/store/services/requests/legacy";

export function useFaqQuery(code: string, enabled: boolean) {
  const clientId = useStore(selectClientId);

  return useQuery({
    queryKey: legacyKeys.faq(code),
    queryFn: () => queryFaq(clientId, code),
    enabled,
  });
}

export function useShareQuery(id: string) {
  const cacheFanMadeContent = useStore((state) => state.cacheFanMadeContent);

  return useQuery({
    queryKey: legacyKeys.share(id),
    queryFn: async () => {
      const shareRead = await getShare(id);
      cacheFanMadeContent([shareRead.data]);
      return shareRead;
    },
  });
}

export function useArkhamDbDeckQuery(type: string, id: number) {
  const clientId = useStore(selectClientId);
  const cacheFanMadeContent = useStore((state) => state.cacheFanMadeContent);

  return useQuery({
    queryKey: legacyKeys.deck(type, id),
    queryFn: async () => {
      const decks = await queryDeck(clientId, type, id);
      cacheFanMadeContent(decks);
      const adapter = new providerAdapters.arkhamdb(useStore.getState);
      return decks.map((deck) => adapter.in(deck));
    },
    enabled: !Number.isNaN(id),
  });
}
