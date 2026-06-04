import type { Database } from "../../db/db.ts";
import type { ArkhamdbDeckSnapshot } from "../../db/schema.types.ts";
import { ACCOUNT_PROVIDER_TYPE } from "./mapping.ts";

export async function listAccountDecksForManifest(
  db: Database,
  accountId: string,
) {
  return await db
    .selectFrom("deck")
    .selectAll()
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

export async function createArkhamDbDeckSnapshot(
  db: Database,
  accountIdentityId: string,
  lastModified: string | null,
  decks: ArkhamdbDeckSnapshot["decks"],
) {
  return await db
    .insertInto("arkhamdb_deck_snapshot")
    .values({
      account_identity_id: accountIdentityId,
      decks: JSON.stringify(decks),
      last_modified: lastModified,
    })
    .returning(["id", "decks", "last_modified"])
    .executeTakeFirstOrThrow();
}

export async function findLatestArkhamDbDeckSnapshotByAccountIdentityId(
  db: Database,
  accountIdentityId: string,
) {
  return await db
    .selectFrom("arkhamdb_deck_snapshot")
    .select(["id", "decks", "last_modified"])
    .where("account_identity_id", "=", accountIdentityId)
    .orderBy("created_at", "desc")
    .executeTakeFirst();
}

export async function findArkhamDbDeckSnapshotByAccountIdAndId(
  db: Database,
  accountId: string,
  snapshotId: string,
) {
  return await db
    .selectFrom("arkhamdb_deck_snapshot")
    .innerJoin(
      "account_identity",
      "account_identity.id",
      "arkhamdb_deck_snapshot.account_identity_id",
    )
    .select([
      "arkhamdb_deck_snapshot.id",
      "arkhamdb_deck_snapshot.decks",
      "arkhamdb_deck_snapshot.last_modified",
    ])
    .where("account_identity.account_id", "=", accountId)
    .where("account_identity.provider", "=", "arkhamdb")
    .where("arkhamdb_deck_snapshot.id", "=", snapshotId)
    .executeTakeFirst();
}
