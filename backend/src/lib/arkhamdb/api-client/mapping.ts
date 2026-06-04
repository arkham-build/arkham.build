import { type Deck, DeckSchema, SlotsSchema } from "@arkham-build/shared";
import type { ArkhamDbRemoteDeck } from "./core/dtos.ts";

export const ARKHAMDB_PROVIDER_TYPE = "arkhamdb";

export function mapArkhamDbDeckToDto(deck: ArkhamDbRemoteDeck): Deck {
  return DeckSchema.parse({
    date_creation: toArkhamDbDeckTimestamp(
      deck.date_creation,
      deck.date_update,
    ),
    date_update: toArkhamDbDeckTimestamp(deck.date_update, deck.date_creation),
    description_md: deck.description_md ?? "",
    exile_string: deck.exile_string ?? null,
    id: deck.id,
    ignoreDeckLimitSlots: parseOptionalSlots(deck.ignoreDeckLimitSlots),
    investigator_code: deck.investigator_code,
    investigator_name: deck.investigator_name ?? "",
    meta: deck.meta,
    name: deck.name,
    next_deck: deck.next_deck ?? null,
    previous_deck: deck.previous_deck ?? null,
    problem: deck.problem,
    sideSlots: parseOptionalSlots(deck.sideSlots),
    slots: SlotsSchema.parse(deck.slots),
    source: ARKHAMDB_PROVIDER_TYPE,
    taboo_id: deck.taboo ?? null,
    tags: deck.tags ?? "",
    user_id: deck.user_id ?? null,
    version: deck.version,
    xp: deck.xp ?? null,
    xp_adjustment: deck.xp_adjustment ?? null,
    xp_spent: deck.xp_spent ?? null,
  });
}

export function isArkhamDbDeckId(id: string | number) {
  return typeof id === "number" || /^\d+$/.test(id);
}

function parseOptionalSlots(value: Record<string, number> | null | undefined) {
  if (value == null) {
    return null;
  }

  return SlotsSchema.parse(value);
}

function toArkhamDbDeckTimestamp(
  primary: string | null | undefined,
  fallback: string | null | undefined,
) {
  return primary ?? fallback ?? new Date().toISOString();
}
