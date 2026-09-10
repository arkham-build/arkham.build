import type { Database } from "../../db/db.ts";
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
