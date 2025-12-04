import type { Deck } from "@/store/schemas/deck.schema";
import { apiV2Request } from "./shared";

export type SortType = "user_reputation" | "date" | "likes" | "popularity";

type DeckSearchResponse = {
  meta: {
    offset: number;
    limit: number;
    total: number;
  };
  data: DeckSearchResult[];
};

export type DeckSearchResult = Deck & {
  description_word_count: number;
  user_name: string;
  user_reputation: string;
  like_count: number;
};

export type DecklistsFiltersState = {
  filters: {
    analyzeSideDecks: boolean;
    authorName: string;
    canonicalInvestigatorCode: string | undefined;
    dateRange: [string, string] | undefined;
    descriptionLength: number;
    excludedCards: string[];
    investigatorFactions: string[];
    name: string | undefined;
    requiredCards: string[];
  };
  offset: number;
  sortBy: SortType;
};

export async function searchDecklists(params: URLSearchParams) {
  const res = await apiV2Request(
    `/v2/public/arkhamdb-decklists/search?${params.toString()}`,
  );

  return res.json() as Promise<DeckSearchResponse>;
}

// MONOREPO: Merge below with backend implementation.

export function deckSearchQuery(
  params: Partial<Omit<DecklistsFiltersState, "filters">> & {
    filters?: Partial<DecklistsFiltersState["filters"]>;
  },
  limit = 10,
) {
  const search = new URLSearchParams([["sort_dir", "desc"]]);

  if (limit) {
    search.append("limit", String(limit));
  } else {
    search.append("limit", "10");
  }

  if (params.offset) {
    search.append("offset", String(params.offset));
  }

  if (params.filters?.authorName) {
    search.append("author", params.filters.authorName);
  }

  if (params.filters?.canonicalInvestigatorCode) {
    search.append("investigator", params.filters.canonicalInvestigatorCode);
  }

  if (params.filters?.requiredCards) {
    for (const code of params.filters.requiredCards) {
      search.append("with", code);
    }
  }

  if (params.sortBy) {
    search.append("sort_by", params.sortBy);
  }

  if (params.filters?.investigatorFactions) {
    for (const faction of params.filters.investigatorFactions) {
      search.append("faction", faction);
    }
  }

  if (params.filters?.dateRange) {
    const [start, end] = params.filters.dateRange;
    search.append("date_start", start);
    search.append("date_end", end);
  }

  if (params.filters?.analyzeSideDecks !== undefined) {
    search.append(
      "side_decks",
      params.filters.analyzeSideDecks ? "true" : "false",
    );
  }

  if (params.filters?.name) {
    search.append("name", params.filters.name);
  }

  if (params.filters?.excludedCards) {
    for (const code of params.filters.excludedCards) {
      search.append("without", code);
    }
  }

  if (params.filters?.descriptionLength !== undefined) {
    search.append(
      "description_length",
      String(params.filters.descriptionLength),
    );
  }

  return search;
}

export function parseDeckSearchQuery(
  search: URLSearchParams,
): DecklistsFiltersState {
  const state: DecklistsFiltersState = {
    filters: {
      analyzeSideDecks: true,
      authorName: "",
      canonicalInvestigatorCode: undefined,
      dateRange: undefined,
      descriptionLength: 0,
      excludedCards: [],
      investigatorFactions: [],
      name: undefined,
      requiredCards: [],
    },
    sortBy: "popularity",
    offset: 0,
  };

  if (search.has("offset")) {
    state.offset = Number(search.get("offset"));
  }

  const author = search.get("author");
  if (author) {
    state.filters.authorName = author;
  }

  const investigator = search.get("investigator");
  if (investigator) {
    state.filters.canonicalInvestigatorCode = investigator;
  }

  const requiredCards = search.getAll("with");
  if (requiredCards.length) {
    state.filters.requiredCards = requiredCards;
  }

  const sortBy = search.get("sort_by");
  if (sortBy) {
    state.sortBy = sortBy as SortType;
  }

  const factions = search.getAll("faction");
  if (factions.length > 0) {
    state.filters.investigatorFactions = factions;
  }

  const dateStart = search.get("date_start");
  const dateEnd = search.get("date_end");
  if (dateStart && dateEnd) {
    state.filters.dateRange = [dateStart, dateEnd];
  }

  const sideDecks = search.get("side_decks");
  if (sideDecks != null) {
    state.filters.analyzeSideDecks = sideDecks === "true";
  }

  const name = search.get("name");
  if (name) {
    state.filters.name = name;
  }

  const excludedCards = search.getAll("without");
  if (excludedCards.length > 0) {
    state.filters.excludedCards = excludedCards;
  }

  const descriptionLength = search.get("description_length");
  if (descriptionLength) {
    state.filters.descriptionLength = Number(descriptionLength);
  }

  return state;
}
