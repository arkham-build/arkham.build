import { type Deck, DeckSchema, SlotsSchema } from "@arkham-build/shared";
import type { Insertable, Selectable } from "kysely";
import type { Deck as DbDeck, Json } from "../db/schema.types.ts";

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

type DeckInsert = Insertable<DbDeck>;
type DeckWriteDto = Omit<
  Deck,
  "date_creation" | "date_update" | "id" | "source" | "user_id" | "version"
>;

export function mapDeckWriteDtoToInsert(
  dto: DeckWriteDto,
): Omit<
  DeckInsert,
  | "account_id"
  | "created_at"
  | "id"
  | "provider_type"
  | "updated_at"
  | "version"
> {
  return {
    description: dto.description_md,
    exile_string: dto.exile_string ?? null,
    ignore_deck_limit: toNullableJson(dto.ignoreDeckLimitSlots),
    investigator_code: dto.investigator_code,
    investigator_name: dto.investigator_name ?? "",
    meta: parseJsonString(dto.meta),
    name: dto.name,
    next_deck: toNullableString(dto.next_deck),
    prev_deck: toNullableString(dto.previous_deck),
    problem: dto.problem ?? null,
    side_slots: toNullableJson(dto.sideSlots),
    slots: SlotsSchema.parse(dto.slots),
    taboo_set_id: dto.taboo_id ?? null,
    tags: emptyStringToNull(dto.tags),
    xp_adjustment: dto.xp_adjustment ?? null,
    xp_spent: dto.xp_spent ?? null,
    xp: dto.xp ?? null,
  };
}

function parseJsonString(value: string): Json | null {
  if (!value) return null;
  return JSON.parse(value) as Json;
}

function toNullableJson(value: Record<string, number> | null | undefined) {
  return value == null ? null : SlotsSchema.parse(value);
}

function toNullableString(
  value: string | number | null | undefined,
): string | null {
  return value == null ? null : String(value);
}

function emptyStringToNull(value: string): string | null {
  return value === "" ? null : value;
}
