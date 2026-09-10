import { readFileSync } from "node:fs";
import { DeckSchema } from "@arkham-build/shared";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  fetchDeck,
  fetchDeckHistory,
} from "../../lib/arkhamdb/api-client/api-public.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { proxyLegacyApiRequest } from "../../lib/legacy-api-proxy.ts";
import {
  resolveLocalPublicDeck,
  resolveLocalPublicDeckHistory,
} from "../../lib/resolve-public-deck.ts";

const routes = new Hono<HonoEnv>();

const LegacyShareHistorySchema = z.object({
  data: DeckSchema,
  history: z.unknown(),
});

const starterDecks = z
  .record(z.string(), DeckSchema)
  .parse(
    JSON.parse(
      readFileSync(
        new URL("../../data/starter_decks.json", import.meta.url),
        "utf8",
      ),
    ),
  );

routes.get("/share/:id", async (c) => {
  const type = c.req.query("type");
  const id = c.req.param("id");

  const starterDeck = starterDecks[id];
  if (starterDeck) return c.json(starterDeck);

  const deck = await resolveLocalPublicDeck(
    c,
    id,
    type === "decklist" ? "decklist" : "deck",
  );
  if (deck) return c.json(deck);

  return proxyLegacyApiRequest(c);
});

routes.get("/share_history/:id", async (c) => {
  const id = c.req.param("id");
  const decks = await resolveLocalPublicDeckHistory(c, id);
  if (decks) return c.json(decks);

  return fetchLegacyShareHistory(c);
});

routes.post("/import", async (c) => {
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

  const data =
    type === "deck"
      ? await fetchDeckHistory(c, id)
      : [await fetchDeck(c, { id, type }).then((res) => res.data)];

  return c.json(data);
});

async function fetchLegacyShareHistory(c: Context<HonoEnv>) {
  const incomingUrl = new URL(c.req.url);
  const upstreamUrl = new URL(
    `${incomingUrl.pathname}${incomingUrl.search}`,
    c.get("config").LEGACY_API_BASE_URL,
  );

  const response = await fetch(upstreamUrl, {
    headers: c.req.raw.headers,
    method: c.req.method,
    redirect: "manual",
  });

  if (!response.ok) {
    return new Response(response.body, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    });
  }

  const share = LegacyShareHistorySchema.parse(await response.json());
  return c.json([
    {
      ...share.data,
      source: "shared",
    },
  ]);
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
