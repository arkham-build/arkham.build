import type { Database } from "../../db/db.ts";

export async function findAccountCardTagStateByAccountId(
  db: Database,
  accountId: string,
) {
  return await db
    .selectFrom("account_card_tag")
    .select(["state", "revision"])
    .where("account_id", "=", accountId)
    .executeTakeFirst();
}
