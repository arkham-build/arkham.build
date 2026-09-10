import { type Deck, DeckSchema } from "@arkham-build/shared";
import type { Context } from "hono";
import {
  fetchDeck,
  fetchDeckHistory,
} from "./arkhamdb/api-client/api-public.ts";
import {
  isArkhamDbDeckId,
  mapArkhamDbDeckToDto,
} from "./arkhamdb/api-client/mapping.ts";
import { mapDeckRowToDto } from "./deck-mapping.ts";
import type { HonoEnv } from "./hono-env.ts";

export async function resolvePublicDeck(
  c: Context<HonoEnv>,
  id: string,
  type: "deck" | "decklist" = "deck",
): Promise<Deck | null> {
  const deck = await resolveLocalPublicDeck(c, id, type);
  if (deck) return deck;

  return fetchLegacyDeck(c, id, type);
}

export async function resolveLocalPublicDeck(
  c: Context<HonoEnv>,
  id: string,
  type: "deck" | "decklist" = "deck",
): Promise<Deck | null> {
  return isArkhamDbDeckId(id)
    ? await fetchDeck(c, { id, type }).then((d) => mapArkhamDbDeckToDto(d.data))
    : await findDeck(c, id);
}

export async function resolveLocalPublicDeckHistory(
  c: Context<HonoEnv>,
  id: string,
): Promise<Deck[] | null> {
  if (isArkhamDbDeckId(id)) {
    const decks = await fetchDeckHistory(c, id);
    return decks.map(mapArkhamDbDeckToDto);
  }

  const deck = await findDeck(c, id);
  if (!deck) return null;

  const seen = new Set([String(deck.id)]);

  const [nextDecks, previousDecks] = await Promise.all([
    fetchLocalSurroundingDecks(c, deck, "next_deck", [], new Set(seen)),
    fetchLocalSurroundingDecks(c, deck, "previous_deck", [], new Set(seen)),
  ]);

  return [...nextDecks.reverse(), deck, ...previousDecks];
}

async function findDeck(c: Context<HonoEnv>, id: string) {
  const deck = await c
    .get("db")
    .selectFrom("deck")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  return deck ? mapDeckRowToDto(deck) : null;
}

async function fetchLocalSurroundingDecks(
  c: Context<HonoEnv>,
  deck: Deck,
  idKey: "next_deck" | "previous_deck",
  decks: Deck[],
  seen: Set<string>,
): Promise<Deck[]> {
  const id = deck[idKey];
  if (!id) return decks;

  const key = String(id);
  if (seen.has(key)) return decks;

  seen.add(key);

  const relatedDeck = await findDeck(c, key);
  if (!relatedDeck) return decks;

  decks.push(relatedDeck);
  return fetchLocalSurroundingDecks(c, relatedDeck, idKey, decks, seen);
}

async function fetchLegacyDeck(
  c: Context<HonoEnv>,
  id: string,
  type: "deck" | "decklist",
) {
  const url = new URL(
    `/v1/public/share/${encodeURIComponent(id)}`,
    c.get("config").LEGACY_API_BASE_URL,
  );
  url.searchParams.set("type", type);

  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Legacy API request failed with status ${response.status}`);
  }

  return DeckSchema.nullable().parse(await response.json());
}
