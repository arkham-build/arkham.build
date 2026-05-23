import type { Database } from "../../db/db.ts";

export async function getAccountByUsername(db: Database, username: string) {
  return await db
    .selectFrom("account")
    .select(["id"])
    .where("name", "=", username)
    .executeTakeFirst();
}

export async function updateProfileUsername(
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
