import { type Deck, DeckSchema, isDeck } from "@arkham-build/shared";
import { z } from "zod";
import type { HttpClient } from "../http-client";

const DecksSchema = z.array(DeckSchema);

type DeckResponse = {
  data: Deck;
  type: "deck" | "decklist";
};

export async function queryDeck(
  client: HttpClient,
  type: string,
  id: number,
): Promise<Deck[]> {
  const res = await client.request(`/v1/public/arkhamdb/${type}/${id}`);
  return DecksSchema.parse(await res.json());
}

export async function importDeck(
  client: HttpClient,
  input: string,
): Promise<DeckResponse> {
  const res = await client.request(
    `/v1/public/import?q=${encodeURIComponent(input)}`,
    { method: "POST" },
  );

  const data: DeckResponse = await res.json();

  if (!isDeck(data.data)) {
    throw new Error("Could not import deck: invalid deck format.");
  }

  return data;
}

export async function getShare(
  client: HttpClient,
  id: string,
): Promise<Deck[]> {
  const res = await client.request(`/v1/public/share_history/${id}`);
  return DecksSchema.parse(await res.json());
}
