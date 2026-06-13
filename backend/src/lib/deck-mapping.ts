import { type Deck, DeckSchema, SlotsSchema } from "@arkham-build/shared";
import type { Selectable } from "kysely";
import type { Deck as DbDeck } from "../db/schema.types.ts";

export const ACCOUNT_PROVIDER_TYPE = "account";

type DeckRow = Selectable<DbDeck>;

export function mapDeckRowToDto(deck: DeckRow): Deck {
  return DeckSchema.parse({
    date_creation: deck.created_at.toISOString(),
    date_update: deck.updated_at.toISOString(),
    description_md: deck.description ?? "",
    exile_string: deck.exile_string,
    id: deck.id,
    ignoreDeckLimitSlots: parseNullableSlots(deck.ignore_deck_limit),
    investigator_code: deck.investigator_code,
    investigator_name: deck.investigator_name,
    meta: stringifyJson(deck.meta),
    name: deck.name,
    next_deck: deck.next_deck,
    previous_deck: deck.prev_deck,
    problem: deck.problem,
    sideSlots: parseNullableSlots(deck.side_slots),
    slots: SlotsSchema.parse(deck.slots),
    source: deck.provider_type,
    taboo_id: deck.taboo_set_id,
    tags: deck.tags ?? "",
    user_id: null,
    version: deck.version ?? "",
    xp_adjustment: deck.xp_adjustment,
    xp_spent: deck.xp_spent,
    xp: deck.xp,
  });
}

function stringifyJson(value: DeckRow["meta"]): string {
  return value == null ? "" : JSON.stringify(value);
}

function parseNullableSlots(
  value: DeckRow["side_slots"] | DeckRow["ignore_deck_limit"],
) {
  if (value == null) return null;
  return SlotsSchema.parse(value);
}
