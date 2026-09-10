import { createHash, randomBytes } from "node:crypto";
import type { Database } from "../../db/db.ts";
import { updateAccountActivity } from "./accounts.ts";

export async function createSession(
  db: Database,
  accountId: string,
  expiryHours: number,
) {
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  const token = generateSessionToken();

  const session = await db
    .insertInto("session")
    .values({
      account_id: accountId,
      expires_at: expiresAt,
      token_hash: hashSessionToken(token),
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  await updateAccountActivity(db, accountId);

  return { ...session, token };
}

export async function deleteSession(db: Database, token: string) {
  return await db
    .deleteFrom("session")
    .where("token_hash", "=", hashSessionToken(token))
    .executeTakeFirst();
}

export async function deleteSessionsByAccountId(
  db: Database,
  accountId: string,
) {
  return await db
    .deleteFrom("session")
    .where("account_id", "=", accountId)
    .executeTakeFirst();
}

export async function getSession(db: Database, token: string) {
  return await db
    .selectFrom("session")
    .selectAll()
    .where("token_hash", "=", hashSessionToken(token))
    .where("expires_at", ">", new Date())
    .orderBy("last_activity_at", "desc")
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
  token: string,
  accountId: string,
  expiryHours: number,
) {
  const now = new Date();
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  const result = await db
    .updateTable("session")
    .set({
      last_activity_at: now,
      expires_at: expiresAt,
    })
    .where("token_hash", "=", hashSessionToken(token))
    .executeTakeFirst();

  await updateAccountActivity(db, accountId);

  return result;
}

function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
