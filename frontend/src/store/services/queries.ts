import type {
  FanMadeProject,
  FanMadeProjectInfo,
  SealedDeckResponse,
} from "@arkham-build/shared";
import {
  encodeSearch,
  type RecommendationsRequest,
  type RecommendationsResponse,
  RecommendationsResponseSchema,
} from "@arkham-build/shared";
import { assert } from "@/utils/assert";
import { type Deck, isDeck } from "../schemas/deck.schema";
import type { History } from "../selectors/decks";
import type { HttpClient } from "./http-client";
import { ApiError } from "./requests/shared";

type FaqResponse = {
  code: string;
  html: string;
  updated: {
    date: string;
  };
}[];

async function request(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(
    `${import.meta.env.VITE_API_LEGACY_URL}/v1${path}`,
    options,
  );

  if (res.status >= 400) {
    const err = await res.json();
    throw new ApiError(err.message, res.status, err?.cause ?? undefined);
  }

  return res;
}

/**
 * Cache API
 */

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

export async function getRecommendations(
  client: HttpClient,
  req: RecommendationsRequest,
): Promise<RecommendationsResponse["data"]["recommendations"]> {
  const search = encodeSearch(req).toString();

  const res = await client.request(
    `/v2/public/recommendations/${req.canonical_investigator_code}?${search}`,
    {
      method: "GET",
    },
  );

  const json = await res.json();
  return RecommendationsResponseSchema.parse(json).data.recommendations;
}

export async function querySealedDeck(
  client: HttpClient,
  id: string,
): Promise<SealedDeckResponse> {
  const res = await client.request(`/v2/public/sealed-deck/${id}`);
  return await res.json();
}

export async function queryFanMadeProjects(
  client: HttpClient,
): Promise<FanMadeProjectInfo[]> {
  const res = await client.request("/v2/public/fan-made-project-info");
  const { data }: { data: FanMadeProjectInfo[] } = await res.json();
  return data.sort((a, b) => {
    return a.meta.name.localeCompare(b.meta.name);
  });
}

export async function queryFanMadeProjectData(
  bucketPath: string,
): Promise<FanMadeProject> {
  const res = await fetch(
    `${import.meta.env.VITE_CARD_IMAGE_URL}/${bucketPath}?nonce=${Date.now()}`,
  );

  assert(res.ok, `Failed to fetch ${bucketPath}`);
  const data = await res.json();
  return data;
}
