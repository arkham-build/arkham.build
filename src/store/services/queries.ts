import encounterSets from "@/store/services/data/encounter_sets.json";
import packs from "@/store/services/data/packs.json";
import type { Deck, Id } from "../slices/data.types";
import { isDeck } from "../slices/data.types";
import reprintPacks from "./data/reprint_packs.json";

import { packToApiFormat } from "@/utils/arkhamdb-json-format";
import { assert } from "@/utils/assert";
import { displayPackName } from "@/utils/formatting";
import i18n from "@/utils/i18n";
import type { FanMadeProject } from "../lib/fan-made-content.schemas";
import type { SealedDeck } from "../lib/types";
import type { History } from "../selectors/decks";
import type { Locale } from "../slices/settings.types";
import type {
  APICard,
  Cycle,
  DataVersion,
  JsonDataEncounterSet,
  Pack,
  Recommendations,
  TabooSet,
} from "./queries.types";

export type MetadataApiResponse = {
  data: Omit<MetadataResponse, "faction" | "reprint_pack" | "type" | "subtype">;
};

export type MetadataResponse = {
  cycle: Cycle[];
  pack: Pack[];
  reprint_pack: Pack[];
  card_encounter_set: JsonDataEncounterSet[];
  taboo_set: TabooSet[];
};

export type DataVersionApiResponse = {
  data: {
    all_card_updated: DataVersion[];
  };
};

export type DataVersionResponse = DataVersion;

export type AllCardApiResponse = {
  data: {
    all_card: APICard[];
  };
};

export type AllCardResponse = APICard[];

type FaqResponse = {
  code: string;
  html: string;
  updated: {
    date: string;
  };
}[];

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/v1${path}`, options);

  if (res.status >= 400) {
    const err = await res.json();
    throw new ApiError(err.message, res.status);
  }

  return res;
}

/**
 * Cache API
 */

export async function queryMetadata(
  locale: Locale = "en",
): Promise<MetadataResponse> {
  const res = await request(`/cache/metadata/${locale}`);
  const { data }: MetadataApiResponse = await res.json();

  const cycles = data.cycle;

  return {
    ...data,
    card_encounter_set: [...data.card_encounter_set, ...encounterSets],
    pack: [...data.pack, ...packs.map(packToApiFormat)],
    reprint_pack: reprintPacks.map((pack) => {
      const mapped = packToApiFormat(pack);

      const cycle = cycles.find((cycle) => cycle.code === pack.cycle_code);
      if (!cycle) return mapped;

      return {
        ...mapped,
        name: `${displayPackName(cycle)} ${i18n.t(`common.packs_new_format.${pack.reprint.type}`)}`,
      };
    }),
  };
}

export async function queryDataVersion(
  locale: Locale = "en",
): Promise<DataVersion> {
  const res = await request(`/cache/version/${locale}`);
  const { data }: DataVersionApiResponse = await res.json();
  return data.all_card_updated[0];
}

export async function queryCards(locale: Locale = "en"): Promise<APICard[]> {
  const res = await request(`/cache/cards/${locale}`);
  const { data }: AllCardApiResponse = await res.json();
  return data.all_card;
}

/**
 * Public API
 */

export async function queryFaq(clientId: string, code: string) {
  const res = await request(`/public/faq/${code}`, {
    headers: {
      "X-Client-Id": clientId,
    },
  });
  const data: FaqResponse = await res.json();
  return data;
}

export async function queryDeck(clientId: string, type: string, id: number) {
  const res = await request(`/public/arkhamdb/${type}/${id}`, {
    headers: {
      "X-Client-Id": clientId,
    },
  });
  const data: Deck[] = await res.json();
  return data;
}

type DeckResponse = {
  data: Deck;
  type: "deck" | "decklist";
};

export async function importDeck(clientId: string, input: string) {
  const res = await request(`/public/import?q=${encodeURIComponent(input)}`, {
    headers: {
      "X-Client-Id": clientId,
    },
    method: "POST",
  });

  const data: DeckResponse = await res.json();

  if (!isDeck(data.data)) {
    throw new Error("Could not import deck: invalid deck format.");
  }

  return data;
}

type ShareRead = {
  data: Deck;
  history: History;
};

export async function getShare(id: string): Promise<ShareRead> {
  const res = await request(`/public/share_history/${id}`);
  const data = await res.json();
  return data;
}

export async function createShare(
  clientId: string,
  deck: Deck,
  history: History,
) {
  await request("/public/share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": clientId,
    },
    body: JSON.stringify({ ...deck, history }),
  });
}

export async function updateShare(
  clientId: string,
  id: string,
  deck: Deck,
  history: History,
) {
  await request(`/public/share/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": clientId,
    },
    body: JSON.stringify({
      ...deck,
      history,
    }),
  });
}

export async function deleteShare(clientId: string, id: string) {
  await request(`/public/share/${id}`, {
    method: "DELETE",
    headers: {
      "X-Client-Id": clientId,
    },
  });
}

/**
 * Authenticated API
 */

function authenticatedRequest(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  return navigator.locks.request("arkhamdb", async () => {
    const res = await request(path, {
      ...options,
      credentials: "include",
    });

    return res;
  });
}

type DecksResponse = {
  data: Deck[];
  lastModified: string | undefined;
};

export async function getDecks(
  lastSyncedDate?: string,
): Promise<DecksResponse | undefined> {
  const headers = lastSyncedDate
    ? {
        "If-Modified-Since": lastSyncedDate,
      }
    : undefined;

  const res = await authenticatedRequest("/user/decks", { headers });

  return res.status === 304
    ? undefined
    : {
        data: await res.json(),
        lastModified: res.headers.get("Last-Modified")?.toString(),
      };
}

export async function newDeck(deck: Deck): Promise<Deck> {
  const res = await authenticatedRequest("/user/decks", {
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      investigator: deck.investigator_code,
      name: deck.name,
      slots: JSON.stringify(deck.slots),
      taboo: deck.taboo_id,
      meta: deck.meta,
    }),
    method: "POST",
  });

  return await res.json();
}

export async function updateDeck(deck: Deck): Promise<Deck> {
  const res = await authenticatedRequest(`/user/decks/${deck.id}`, {
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(deck),
    method: "PUT",
  });

  return await res.json();
}

export async function deleteDeck(id: Id, allVersions?: boolean) {
  const path = `/user/decks/${id}`;

  await authenticatedRequest(allVersions ? `${path}?all=true` : path, {
    body: allVersions ? JSON.stringify({ all: true }) : undefined,
    method: "DELETE",
  });
}

export async function upgradeDeck(
  id: Id,
  payload: {
    xp: number;
    exiles?: string;
    meta?: string;
  },
) {
  const res = await authenticatedRequest(`/user/decks/${id}/upgrade`, {
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    method: "POST",
  });

  return await res.json();
}

async function recommendationRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(
    `${import.meta.env.VITE_RECOMMENDATION_API_URL}${path}`,
    options,
  );

  if (res.status >= 400) {
    const err = await res.json();
    throw new ApiError(err.message, res.status);
  }

  return res;
}

type RecommendationAnalysisAlgorithm =
  | "absolute percentage"
  | "percentile rank";

type RecommendationRequest = {
  canonical_investigator_code: string;
  analyze_side_decks: boolean;
  analysis_algorithm: RecommendationAnalysisAlgorithm;
  required_cards: string[];
  cards_to_recommend: string[];
  date_range: [string, string];
};

type RecommendationApiResponse = {
  data: {
    recommendations: Recommendations;
  };
};

export async function getRecommendations(
  canonicalInvestigatorCode: string,
  analyzeSideDecks: boolean,
  relativeAnalysis: boolean,
  requiredCards: string[],
  cardsToRecommend: string[],
  dateRange: [string, string],
) {
  const req: RecommendationRequest = {
    canonical_investigator_code: canonicalInvestigatorCode,
    analyze_side_decks: analyzeSideDecks,
    analysis_algorithm: relativeAnalysis
      ? "percentile rank"
      : "absolute percentage",
    required_cards: requiredCards,
    cards_to_recommend: cardsToRecommend,
    date_range: dateRange,
  };

  const res = await recommendationRequest("/recommendations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });
  const { data }: RecommendationApiResponse = await res.json();
  return data.recommendations;
}

export async function querySealedDeck(id: string): Promise<SealedDeck> {
  const res = await request(`/public/sealed_deck/${id}`);
  return await res.json();
}

export type FanMadeProjectListing = {
  bucket_path: string;
  id: string;
  meta: FanMadeProject["meta"];
};

export async function queryFanMadeProjects(): Promise<FanMadeProjectListing[]> {
  const res = await request("/public/fan_made_projects");
  const { data }: { data: FanMadeProjectListing[] } = await res.json();
  return data.sort((a, b) => {
    return a.meta.name.localeCompare(b.meta.name);
  });
}

export async function queryFanMadeProjectData(
  bucketPath: string,
): Promise<FanMadeProject> {
  const res = await fetch(
    `${import.meta.env.VITE_CARD_IMAGE_URL}/${bucketPath}`,
  );

  assert(res.ok, `Failed to fetch ${bucketPath}`);
  const data = await res.json();
  return data;
}
