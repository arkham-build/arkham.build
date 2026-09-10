import { type Selectable, sql } from "kysely";
import type { Database } from "../../db/db.ts";
import type { AccountIdentity } from "../../db/schema.types.ts";

export function getAccountIdentity(db: Database, id: string) {
  return db
    .selectFrom("account_identity")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export async function getAccountIdentityByUsername(
  db: Database,
  provider: string,
  username: string,
) {
  return await db
    .selectFrom("account_identity")
    .innerJoin("account", "account.id", "account_identity.account_id")
    .selectAll("account_identity")
    .where("account_identity.provider", "=", provider)
    .where(sql`lower(account.name)`, "=", username.toLowerCase())
    .executeTakeFirst();
}

export async function getAccountIdentityByProviderUserId(
  db: Database,
  provider: string,
  providerUserId: string,
) {
  return await db
    .selectFrom("account_identity")
    .selectAll("account_identity")
    .where("account_identity.provider", "=", provider)
    .where("account_identity.provider_user_id", "=", providerUserId)
    .executeTakeFirst();
}

export async function getAccountIdentityByAccountIdAndProvider(
  db: Database,
  accountId: string,
  provider: string,
) {
  return await db
    .selectFrom("account_identity")
    .selectAll("account_identity")
    .where("account_id", "=", accountId)
    .where("provider", "=", provider)
    .executeTakeFirst();
}

export async function listAccountIdentitiesByAccountId(
  db: Database,
  accountId: string,
): Promise<AccountIdentitySummary[]> {
  return await db
    .selectFrom("account_identity")
    .select([
      "provider",
      "provider_user_id",
      "email",
      "pending_email",
      "verified_at",
      "created_at",
      "state",
    ])
    .where("account_id", "=", accountId)
    .orderBy("provider", "asc")
    .execute();
}

export async function updateAccountIdentityState(
  db: Database,
  accountIdentityId: string,
  state: AccountIdentity["state"],
) {
  return await db
    .updateTable("account_identity")
    .set({ state, updated_at: new Date() })
    .where("id", "=", accountIdentityId)
    .returning(["state"])
    .executeTakeFirstOrThrow();
}

export async function getAccountIdentityByEmail(db: Database, email: string) {
  return await db
    .selectFrom("account_identity")
    .selectAll()
    .where("provider", "=", "email")
    .where("email", "=", email)
    .executeTakeFirst();
}

export async function getAccountIdentityByEmailOrPendingEmail(
  db: Database,
  email: string,
) {
  return await db
    .selectFrom("account_identity")
    .selectAll()
    .where("provider", "=", "email")
    .where((eb) =>
      eb.or([eb("email", "=", email), eb("pending_email", "=", email)]),
    )
    .executeTakeFirst();
}

type AccountIdentitySummary = Pick<
  Selectable<AccountIdentity>,
  | "created_at"
  | "email"
  | "pending_email"
  | "provider"
  | "provider_user_id"
  | "state"
  | "verified_at"
>;
