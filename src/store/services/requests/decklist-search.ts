import type { Deck } from "@/store/slices/data.types";
import { apiV2Request } from "./shared";

export type SortType = "user_reputation" | "date" | "likes" | "popularity";

type DeckSearchRequestParams = {
  analyzeSideDecks?: boolean;
  authorName?: string;
  canonicalInvestigatorCode?: string;
  dateRange?: [string, string];
  description_length?: number;
  excludedCards?: string[];
  investigatorFactions?: string[];
  limit?: number;
  name?: string;
  offset?: number;
  requiredCards?: string[];
  sortBy?: SortType;
};

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

export async function searchDecklists(params: DeckSearchRequestParams) {
  const res = await apiV2Request(
    `/v2/public/arkhamdb-decklists/search?${deckSearchQuery(params)}`,
  );

  return res.json() as Promise<DeckSearchResponse>;
}

function deckSearchQuery(params: DeckSearchRequestParams) {
  const search = new URLSearchParams([["sort_dir", "desc"]]);

  if (params.limit) {
    search.append("limit", String(params.limit));
  } else {
    search.append("limit", "10");
  }

  if (params.offset) {
    search.append("offset", String(params.offset));
  }

  if (params.authorName) {
    search.append("author", params.authorName);
  }

  if (params.canonicalInvestigatorCode) {
    search.append("investigator", params.canonicalInvestigatorCode);
  }

  if (params.requiredCards) {
    for (const code of params.requiredCards) {
      search.append("with", code);
    }
  }

  if (params.sortBy) {
    search.append("sort_by", params.sortBy);
  }

  if (params.investigatorFactions) {
    for (const faction of params.investigatorFactions) {
      search.append("faction", faction);
    }
  }

  if (params.dateRange) {
    search.append("date_start", params.dateRange[0]);
    search.append("date_end", params.dateRange[1]);
  }

  if (params.analyzeSideDecks !== undefined) {
    search.append("side_decks", params.analyzeSideDecks ? "true" : "false");
  }

  if (params.name) {
    search.append("name", params.name);
  }

  if (params.excludedCards) {
    for (const code of params.excludedCards) {
      search.append("without", code);
    }
  }

  if (params.description_length !== undefined) {
    search.append("description_length", String(params.description_length));
  }

  return search.toString();
}
