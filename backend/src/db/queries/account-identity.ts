import type { Database } from "../db.ts";

export function getAccountIdentity(db: Database, id: string) {
  return db
    .selectFrom("account_identity")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export function getAccountIdentityByAccountId(db: Database, accountId: string) {
  return db
    .selectFrom("account_identity")
    .selectAll()
    .where("account_id", "=", accountId)
    .where("provider", "=", "email")
    .executeTakeFirst();
}

export async function getAccountIdentityByEmail(db: Database, email: string) {
  return await db
    .selectFrom("account_identity")
    .selectAll()
    .where("provider", "=", "email")
    .where("email", "=", email)
    .executeTakeFirst();
}

export async function updateAccountIdentityVerified(
  db: Database,
  accountIdentityId: string,
) {
  const now = new Date();
  return await db
    .updateTable("account_identity")
    .set({ verified_at: now, updated_at: now })
    .where("id", "=", accountIdentityId)
    .executeTakeFirst();
}

export async function updatePasswordHash(
  db: Database,
  accountIdentityId: string,
  passwordHash: string,
) {
  return await db
    .updateTable("account_identity")
    .set({ password_hash: passwordHash, updated_at: new Date() })
    .where("provider", "=", "email")
    .where("id", "=", accountIdentityId)
    .executeTakeFirst();
}
