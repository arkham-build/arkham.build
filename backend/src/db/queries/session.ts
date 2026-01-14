import type { Database } from "../db.ts";

export async function createSession(
  db: Database,
  accountId: string,
  expiryHours: number,
) {
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  return await db
    .insertInto("session")
    .values({
      account_id: accountId,
      expires_at: expiresAt,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteSession(db: Database, id: string) {
  return await db.deleteFrom("session").where("id", "=", id).executeTakeFirst();
}

export async function getSession(db: Database, id: string) {
  return await db
    .selectFrom("session")
    .selectAll()
    .where("id", "=", id)
    .where("expires_at", ">", new Date())
    .executeTakeFirst();
}

export async function cleanupExpiredSessions(db: Database) {
  return await db
    .deleteFrom("session")
    .where("expires_at", "<", new Date())
    .executeTakeFirst();
}

export async function updateSessionActivity(
  db: Database,
  sessionId: string,
  expiryHours: number,
) {
  const now = new Date();
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  return await db
    .updateTable("session")
    .set({
      last_activity_at: now,
      expires_at: expiresAt,
    })
    .where("id", "=", sessionId)
    .executeTakeFirst();
}
