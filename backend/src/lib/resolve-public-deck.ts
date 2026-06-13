import type { Deck } from "@arkham-build/shared";
import type { Context } from "hono";
import type { Database } from "../db/db.ts";
import { fetchDeck } from "./arkhamdb/api-client/api-public.ts";
import { mapArkhamDbDeckToDto } from "./arkhamdb/api-client/mapping.ts";
import { mapDeckRowToDto } from "./deck-mapping.ts";
import type { HonoEnv } from "./hono-env.ts";

export async function resolvePublicDeck(
  c: Context<HonoEnv>,
  id: string,
  type: "deck" | "decklist" = "deck",
): Promise<Deck | null> {
  const deck = /^\d+$/.test(id)
    ? await fetchDeck(c, { id, type }).then((d) => mapArkhamDbDeckToDto(d.data))
    : await findDeck(c.get("db"), id);

  return deck;
}

async function findDeck(db: Database, id: string) {
  const deck = await db
    .selectFrom("deck")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  if (!deck) return null; // XXX: resolve old shares
  return mapDeckRowToDto(deck);
}
