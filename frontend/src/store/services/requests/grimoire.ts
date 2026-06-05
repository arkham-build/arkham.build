import {
  type CardErrataResponse,
  CardErrataResponseSchema,
  type CardFaqResponse,
  CardFaqResponseSchema,
  type GrimoireResponse,
  GrimoireResponseSchema,
} from "@arkham-build/shared";
import type { HttpClient } from "../http-client";

export async function queryGrimoire(
  client: HttpClient,
): Promise<GrimoireResponse> {
  const res = await client.request("/v2/public/grimoire");
  const data = await res.json();
  return GrimoireResponseSchema.parse(data);
}

export async function queryCardFaq(
  client: HttpClient,
  cardCode: string,
): Promise<CardFaqResponse> {
  const res = await client.request(`/v2/public/faq/card/${cardCode}`);
  const data = await res.json();
  return CardFaqResponseSchema.parse(data);
}

export async function queryCardErrata(
  client: HttpClient,
  cardCode: string,
): Promise<CardErrataResponse> {
  const res = await client.request(`/v2/public/errata/card/${cardCode}`);
  const data = await res.json();
  return CardErrataResponseSchema.parse(data);
}
