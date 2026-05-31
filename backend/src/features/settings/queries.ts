import type { Database } from "../../db/db.ts";
import type { AccountSettings } from "../../db/schema.types.ts";

export async function findAccountSettingsByAccountId(
  db: Database,
  accountId: string,
) {
  return await db
    .selectFrom("account_settings")
    .select(["settings", "collection", "revision"])
    .where("account_id", "=", accountId)
    .executeTakeFirst();
}

export async function upsertAccountSettings(
  db: Database,
  accountId: string,
  revision: string,
  collection: AccountSettings["collection"],
  settings: AccountSettings["settings"],
) {
  return await db
    .insertInto("account_settings")
    .values({
      account_id: accountId,
      collection,
      revision,
      settings,
    })
    .onConflict((oc) =>
      oc.column("account_id").doUpdateSet({
        collection,
        revision,
        settings,
      }),
    )
    .returning(["settings", "collection", "revision"])
    .executeTakeFirstOrThrow();
}
