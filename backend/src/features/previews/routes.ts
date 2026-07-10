import assert from "node:assert";
import type { Deck, DeckMeta } from "@arkham-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { markdownToText } from "../../lib/markdown-to-text.ts";
import { resolvePublicDeck } from "../../lib/resolve-public-deck.ts";

const routes = new Hono<HonoEnv>();

routes.get("/card/:id", async (c) => {
  const id = c.req.param("id");

  const db = c.get("db");

  const card = await db
    .selectFrom("card")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  if (!card) throw new HTTPException(404, { message: "Card not found." });

  let title = card.name;
  if (card.xp) title += ` (${card.xp})`;

  let description = card.subname ? `${card.subname}. ` : "";
  if (card.traits) description += card.traits;
  if (card.text) description += `\n${card.text}`;

  return c.json({
    title,
    description,
    "og:title": title,
    "og:description": description,
    "og:image": `https://assets.arkham.build/optimized/${id}.jpg`,
    "twitter:card": "summary_large_image",
  });
});

routes.get("/:type/:id", async (c) => {
  const id = c.req.param("id");
  const type = c.req.param("type");

  assert(
    type === "deck" || type === "decklist",
    `Type must be either 'deck' or 'decklist'`,
  );

  const deck = await resolvePublicDeck(c, id, type);
  if (!deck) throw new HTTPException(404, { message: "Not found" });

  const meta = parseDeckMeta(deck.meta);
  const title = deck.name;
  const description =
    typeof meta.intro_md === "string" ? markdownToText(meta.intro_md) : "";

  return c.json({
    title,
    description,
    "og:title": title,
    "og:description": description,
    "og:image": deckThumbnail(deck),
    "twitter:card": "summary_large_image",
  });
});

function deckThumbnail(deck: Deck) {
  const meta = parseDeckMeta(deck.meta);
  if (meta.banner_url) return meta.banner_url;

  const code =
    meta.alternate_front ||
    meta.hidden_slots?.investigator_code ||
    deck.investigator_code;

  const fanMadeCard = meta?.fan_made_content?.cards[code];
  if (fanMadeCard?.thumbnail_url) return fanMadeCard.thumbnail_url;

  return `https://assets.arkham.build/thumbnails/${code}.jpg`;
}

function parseDeckMeta(meta: string | null | undefined): DeckMeta {
  try {
    const parsed = JSON.parse(meta ?? "");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export default routes;
