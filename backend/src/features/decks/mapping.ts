import { createHash } from "node:crypto";
import { type Deck, SlotsSchema } from "@arkham-build/shared";
import type { Insertable } from "kysely";
import type { Deck as DbDeck, Json } from "../../db/schema.types.ts";

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

export function createDeckManifestVersion(
  decks: Array<{ id: string | number; updatedAt: string; version: string }>,
) {
  const hash = createHash("sha256");

  for (const item of decks) {
    hash.update(`${item.id}:${item.version}:${item.updatedAt}`);
  }

  return hash.digest("hex");
}
