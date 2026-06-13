import type { Deck } from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Database } from "../../db/db.ts";
import {
  fetchDeck,
  fetchDeckHistory,
} from "../../lib/arkhamdb/api-client/api-public.ts";
import { mapArkhamDbDeckToDto } from "../../lib/arkhamdb/api-client/mapping.ts";
import { mapDeckRowToDto } from "../../lib/deck-mapping.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { resolvePublicDeck } from "../../lib/resolve-public-deck.ts";

const routes = new Hono<HonoEnv>();

routes.get("/share/:id", async (c) => {
  const type = c.req.query("type");
  const id = c.req.param("id");
  const deck = await resolvePublicDeck(
    c,
    id,
    type === "decklist" ? "decklist" : "deck",
  );
  return c.json(deck);
});

routes.get("/share_history/:id", async (c) => {
  const id = c.req.param("id");

  if (/^\d+$/.test(id)) {
    const decks = await fetchDeckHistory(c, id);
    return c.json(decks.map(mapArkhamDbDeckToDto));
  }

  return c.json(await fetchLocalDeckHistory(c.get("db"), id));
});

routes.get("/import", async (c) => {
  const query = parseCodeFromArkhamDbUrl(c.req.query("q"));

  if (!query) {
    const message = "Input is not a valid ArkhamDB deck id or url.";
    throw new HTTPException(400, { message });
  }

  const deck = await fetchDeck(c, query).then((res) => res.data);
  if (deck?.next_deck != null) {
    const message = "Deck has a newer version.";
    throw new HTTPException(400, {
      message,
    });
  }

  return c.json({ data: deck, type: query.type });
});

routes.get("/arkhamdb/:type/:id", async (c) => {
  const id = c.req.param("id");
  const type = c.req.param("type");
  const deck = await fetchDeck(c, { id, type }).then((res) => res.data);
  return c.json(deck);
});

async function fetchLocalDeckHistory(db: Database, id: string) {
  const deck = await findLocalDeck(db, id);
  if (!deck) return [];

  const [nextDecks, previousDecks] = await Promise.all([
    fetchLocalSurroundingDecks(db, deck, "next_deck"),
    fetchLocalSurroundingDecks(db, deck, "previous_deck"),
  ]);

  return [...nextDecks.reverse(), deck, ...previousDecks];
}

async function fetchLocalSurroundingDecks(
  db: Database,
  deck: Deck,
  idKey: "next_deck" | "previous_deck",
  decks: Deck[] = [],
): Promise<Deck[]> {
  const id = deck[idKey];
  if (!id) return decks;

  const relatedDeck = await findLocalDeck(db, String(id));
  if (!relatedDeck) return decks;

  decks.push(relatedDeck);
  return fetchLocalSurroundingDecks(db, relatedDeck, idKey, decks);
}

async function findLocalDeck(db: Database, id: string) {
  const deck = await db
    .selectFrom("deck")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  return deck ? mapDeckRowToDto(deck) : undefined;
}

export function parseCodeFromArkhamDbUrl(input?: string) {
  if (!input) return undefined;

  const url = decodeURIComponent(input);

  if (url.includes("/deck/")) {
    const regex = /\/deck\/view\/(\d+)/;
    const id = url.match(regex)?.[1];
    return id ? { id, type: "deck" } : undefined;
  }

  if (url.includes("/decklist/")) {
    const regex = /\/decklist\/view\/(\d+)(?:\/|$)/;
    const id = url.match(regex)?.[1];
    return id ? { id, type: "decklist" } : undefined;
  }

  const regex = /^(\d+)$/;
  const id = url.match(regex)?.[1];
  return id ? { id, type: "deck" } : undefined;
}

export default routes;
