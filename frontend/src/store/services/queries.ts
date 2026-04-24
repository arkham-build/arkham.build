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
import { type Deck, type Id, isDeck } from "../schemas/deck.schema";
import type { History } from "../selectors/decks";
import { ApiError, apiV2Request } from "./requests/shared";

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

function authenticatedRequest(path: string, options?: RequestInit) {
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
  clientId: string,
  lastSyncedDate?: string,
): Promise<DecksResponse | undefined> {
  const headers: Record<string, string> = {
    "X-Client-Id": clientId,
  };

  if (lastSyncedDate) {
    headers["If-Modified-Since"] = lastSyncedDate;
  }

  const res = await authenticatedRequest("/user/decks", { headers });

  return res.status === 304
    ? undefined
    : {
        data: await res.json(),
        lastModified: res.headers.get("Last-Modified")?.toString(),
      };
}

export async function newDeck(
  clientId: string,
  payload: Record<string, unknown>,
): Promise<Deck> {
  const res = await authenticatedRequest("/user/decks", {
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": clientId,
    },
    body: JSON.stringify({
      investigator: payload.investigator_code,
      name: payload.name,
      slots: payload.slots,
      taboo: payload.taboo,
      meta: payload.meta,
    }),
    method: "POST",
  });

  return await res.json();
}

export async function updateDeck(
  clientId: string,
  deck: Record<string, unknown>,
): Promise<Deck> {
  const res = await authenticatedRequest(`/user/decks/${deck.id}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": clientId,
    },
    body: JSON.stringify(deck),
    method: "PUT",
  });

  return await res.json();
}

export async function deleteDeck(
  clientId: string,
  id: Id,
  allVersions?: boolean,
) {
  const path = `/user/decks/${id}`;

  await authenticatedRequest(allVersions ? `${path}?all=true` : path, {
    headers: {
      "X-Client-Id": clientId,
    },
    body: allVersions ? JSON.stringify({ all: true }) : undefined,
    method: "DELETE",
  });
}

export async function upgradeDeck(
  clientId: string,
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
      "X-Client-Id": clientId,
    },
    body: JSON.stringify(payload),
    method: "POST",
  });

  return await res.json();
}

export async function getRecommendations(
  req: RecommendationsRequest,
): Promise<RecommendationsResponse["data"]["recommendations"]> {
  const search = encodeSearch(req).toString();

  const res = await apiV2Request(
    `/v2/public/recommendations/${req.canonical_investigator_code}?${search}`,
    {
      method: "GET",
    },
  );

  const json = await res.json();
  return RecommendationsResponseSchema.parse(json).data.recommendations;
}

export async function querySealedDeck(id: string): Promise<SealedDeckResponse> {
  const res = await apiV2Request(`/v2/public/sealed-deck/${id}`);
  return await res.json();
}

export async function queryFanMadeProjects(): Promise<FanMadeProjectInfo[]> {
  const res = await apiV2Request("/v2/public/fan-made-project-info");
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
