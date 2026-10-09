import assert from "node:assert";
import type { Transaction } from "kysely";
import type { Database } from "../../db/db.ts";
import type { DB } from "../../db/schema.types.ts";
import { ACCOUNT_PROVIDER_TYPE } from "../../lib/deck-mapping.ts";

export async function listAccountDecksForManifest(
  db: Database,
  accountId: string,
) {
  return await db
    .selectFrom("deck")
    .select(["id", "updated_at", "version"])
    .where("account_id", "=", accountId)
    .where("provider_type", "=", ACCOUNT_PROVIDER_TYPE)
    .orderBy("id")
    .execute();
}

export async function findAccountDeckById(
  db: Database,
  accountId: string,
  id: string,
) {
  return await db
    .selectFrom("deck")
    .selectAll()
    .where("account_id", "=", accountId)
    .where("provider_type", "=", ACCOUNT_PROVIDER_TYPE)
    .where("id", "=", id)
    .executeTakeFirst();
}

export async function lockAccountDeckById(
  tx: Transaction<DB>,
  accountId: string,
  id: string,
) {
  return await tx
    .selectFrom("deck")
    .selectAll()
    .where("account_id", "=", accountId)
    .where("provider_type", "=", ACCOUNT_PROVIDER_TYPE)
    .where("id", "=", id)
    .forUpdate()
    .executeTakeFirst();
}

export async function collectAccountDeckHistoryIds(
  tx: Transaction<DB>,
  accountId: string,
  deck: { id: string; prev_deck: string | null },
) {
  const ids = [deck.id];
  const seen = new Set(ids);
  let previousId = deck.prev_deck;

  while (previousId) {
    const previous = await lockAccountDeckById(tx, accountId, previousId);
    if (!previous) break;

    assert(!seen.has(previous.id), "Deck history contains a cycle.");
    ids.push(previous.id);
    seen.add(previous.id);
    previousId = previous.prev_deck;
  }

  return ids;
}

export async function listAccountDecksByIds(
  db: Database,
  accountId: string,
  ids: string[],
) {
  if (!ids.length) {
    return [];
  }

  return await db
    .selectFrom("deck")
    .selectAll()
    .where("account_id", "=", accountId)
    .where("provider_type", "=", ACCOUNT_PROVIDER_TYPE)
    .where("id", "in", ids)
    .execute();
}
