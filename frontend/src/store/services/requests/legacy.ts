import { type Deck, isDeck } from "@arkham-build/shared";
import type { History } from "@/store/selectors/decks";
import { ApiError } from "./shared";

type FaqResponse = {
  code: string;
  html: string;
  updated: {
    date: string;
  };
}[];

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

type ShareRead = {
  data: Deck;
  history: History;
};

export async function getShare(id: string): Promise<ShareRead> {
  const res = await request(`/public/share_history/${id}`);
  const data = await res.json();
  return data;
}
