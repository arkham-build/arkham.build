import {
  keepPreviousData,
  type UseQueryResult,
  useQuery,
} from "@tanstack/react-query";
import { decklistKeys } from "@/queries/keys";
import { useHttpClient } from "@/store/services/http-client.context";
import { fetchArkhamDBDecklistMeta } from "@/store/services/requests/decklist-meta";
import {
  type DecklistsFiltersState,
  deckSearchQuery,
  searchDecklists,
} from "@/store/services/requests/decklists-search";

const DECKLISTS_PAGE_SIZE = 30;

type DecklistsSearchResult = Awaited<ReturnType<typeof searchDecklists>>;

export function useDecklistsSearchQuery(
  state: DecklistsFiltersState,
): UseQueryResult<DecklistsSearchResult> {
  const client = useHttpClient();
  const search = deckSearchQuery(state, DECKLISTS_PAGE_SIZE);

  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: decklistKeys.search(search.toString()),
    queryFn: () => searchDecklists(client, search),
  });
}

export function usePopularDecklistsQuery(
  scopeCode: string,
  params: Parameters<typeof deckSearchQuery>[0],
  enabled: boolean,
): UseQueryResult<DecklistsSearchResult> {
  const client = useHttpClient();
  const search = deckSearchQuery(params, 10);

  return useQuery({
    queryKey: decklistKeys.popular(scopeCode),
    queryFn: () => searchDecklists(client, search),
    enabled,
  });
}

export function useArkhamDbDecklistMetaQuery(id: number, enabled: boolean) {
  const client = useHttpClient();

  return useQuery({
    queryKey: decklistKeys.meta(id),
    queryFn: () => fetchArkhamDBDecklistMeta(client, id),
    enabled,
  });
}
