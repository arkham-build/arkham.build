import type { Database } from "../../db/db.ts";

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
