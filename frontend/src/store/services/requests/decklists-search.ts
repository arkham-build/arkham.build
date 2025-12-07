import {
  type DecklistSearchRequest,
  DecklistSearchRequestSchema,
  type DecklistSearchResponse,
  decodeSearch,
  encodeSearch,
} from "@arkham-build/shared";
import { apiV2Request } from "./shared";

export type SortType = "user_reputation" | "date" | "likes" | "popularity";

export type DecklistsFiltersState = {
  filters: Omit<
    DecklistSearchRequest,
    "offset" | "sort_by" | "sort_dir" | "limit"
  >;
  limit: number;
  offset: number;
  sort_by: SortType;
  sort_dir: "asc" | "desc";
};

export async function searchDecklists(params: URLSearchParams) {
  const res = await apiV2Request(
    `/v2/public/arkhamdb-decklists/search?${params.toString()}`,
  );

  return res.json() as Promise<DecklistSearchResponse>;
}

export function deckSearchQuery(
  params: Partial<Omit<DecklistsFiltersState, "filters">> & {
    filters?: Partial<DecklistsFiltersState["filters"]>;
  },
  limit = 10,
) {
  const { filters, ...rest } = params;
  const search = encodeSearch({
    ...filters,
    ...rest,
    limit,
  });
  return search;
}

export function parseDeckSearchQuery(
  search: URLSearchParams,
): DecklistsFiltersState {
  const queries = search.keys().reduce(
    (acc, key) => {
      const values = search.getAll(key);
      acc[key] = values.length > 1 ? values : [values[0]];
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const { limit, offset, sort_by, sort_dir, ...filters } = decodeSearch(
    DecklistSearchRequestSchema,
    queries,
  );

  return {
    filters,
    limit,
    offset,
    sort_by: sort_by as SortType,
    sort_dir,
  };
}
