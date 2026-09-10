import assert from "node:assert/strict";
import { type Deck, DeckSchema, SlotsSchema } from "@arkham-build/shared";
import type { Selectable } from "kysely";
import type { ArkhamdbDecklist } from "../../../db/schema.types.ts";
import {
  type ArkhamDbRemoteDeck,
  ArkhamDbRemoteDeckSchema,
} from "./core/dtos.ts";

export const ARKHAMDB_PROVIDER_TYPE = "arkhamdb";

type ArkhamDbDecklistRow = Selectable<ArkhamdbDecklist>;

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
    meta: normalizeDeckMeta(deck.meta),
    name: deck.name,
    next_deck: deck.next_deck ?? null,
    previous_deck: deck.previous_deck ?? null,
    problem: deck.problem,
    sideSlots: parseOptionalSlots(deck.sideSlots),
    slots: SlotsSchema.parse(deck.slots),
    source: ARKHAMDB_PROVIDER_TYPE,
    taboo_id: deck.taboo_id ?? deck.taboo ?? null,
    tags: deck.tags ?? "",
    user_id: deck.user_id ?? null,
    version: deck.version,
    xp: deck.xp ?? null,
    xp_adjustment: deck.xp_adjustment ?? null,
    xp_spent: deck.xp_spent ?? null,
  });
}

export function mapArkhamDbDecklistRowToRemoteDeck(
  decklist: ArkhamDbDecklistRow,
): ArkhamDbRemoteDeck {
  assert(decklist.version != null, "Expected cached decklist version.");

  return ArkhamDbRemoteDeckSchema.parse({
    date_creation: decklist.date_creation.toISOString(),
    date_update: decklist.date_update?.toISOString(),
    description_md: decklist.description_md,
    exile_string: decklist.exile_string,
    id: decklist.id,
    ignoreDeckLimitSlots: decklist.ignore_deck_limit_slots,
    investigator_code: decklist.investigator_code,
    investigator_name: decklist.investigator_name,
    meta: stringifyArkhamDbDecklistMeta(decklist.meta),
    name: decklist.name,
    next_deck: decklist.next_deck,
    previous_deck: decklist.previous_deck,
    sideSlots: decklist.side_slots,
    slots: decklist.slots,
    taboo_id: decklist.taboo_id,
    tags: decklist.tags,
    user_id: decklist.user_id,
    version: decklist.version,
    xp: decklist.xp,
    xp_adjustment: decklist.xp_adjustment,
    xp_spent: decklist.xp_spent,
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

function stringifyArkhamDbDecklistMeta(value: ArkhamDbDecklistRow["meta"]) {
  return typeof value === "string" ? value : JSON.stringify(value ?? {});
}

function normalizeDeckMeta(meta: string) {
  try {
    const parsed = JSON.parse(meta);
    return typeof parsed === "object" &&
      parsed != null &&
      !Array.isArray(parsed)
      ? meta
      : "{}";
  } catch {
    return "{}";
  }
}

function toArkhamDbDeckTimestamp(
  primary: string | null | undefined,
  fallback: string | null | undefined,
) {
  return primary ?? fallback ?? new Date().toISOString();
}
