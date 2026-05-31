import type { Database } from "../../db/db.ts";

export async function findAccountByUsername(db: Database, username: string) {
  return await db
    .selectFrom("account")
    .select(["id"])
    .where("name", "=", username)
    .executeTakeFirst();
}

export async function updateAccountUsername(
  db: Database,
  accountId: string,
  username: string,
) {
  const now = new Date();

  return await db
    .updateTable("account")
    .set({ name: username, updated_at: now })
    .where("id", "=", accountId)
    .executeTakeFirst();
}
