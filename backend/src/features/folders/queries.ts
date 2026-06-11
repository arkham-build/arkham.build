import type { Database } from "../../db/db.ts";

export async function findAccountFolderStateByAccountId(
  db: Database,
  accountId: string,
) {
  return await db
    .selectFrom("account_folder")
    .select(["state", "revision"])
    .where("account_id", "=", accountId)
    .executeTakeFirst();
}
