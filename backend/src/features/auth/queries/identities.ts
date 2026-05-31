import assert from "node:assert";
import type { Selectable } from "kysely";
import type { Database } from "../../../db/db.ts";
import type { AccountIdentity } from "../../../db/schema.types.ts";
import type { OAuthAccessToken } from "../../../lib/oauth.ts";
import { upsertOAuthToken } from "./oauth-tokens.ts";

export async function createEmailIdentity(
  db: Database,
  accountId: string,
  pendingEmail: string,
  passwordHash: string,
) {
  return await db
    .insertInto("account_identity")
    .values({
      account_id: accountId,
      provider: "email",
      provider_user_id: null,
      email: null,
      pending_email: pendingEmail,
      password_hash: passwordHash,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

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
    .where("account.name", "=", username)
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

function assertOAuthProvider(provider: string) {
  assert(provider !== "email", "Expected an OAuth provider.");
}

export interface ConnectOAuthIdentityToAccountParams {
  accountId: string;
  provider: string;
  providerUserId: string;
  accessToken: OAuthAccessToken;
}

export async function connectOAuthIdentityToAccount(
  db: Database,
  params: ConnectOAuthIdentityToAccountParams,
) {
  assertOAuthProvider(params.provider);

  return await db.transaction().execute(async (tx) => {
    const existingIdentity = await getAccountIdentityByAccountIdAndProvider(
      tx,
      params.accountId,
      params.provider,
    );

    if (existingIdentity) {
      assert(
        existingIdentity.provider_user_id === params.providerUserId,
        "OAuth identity provider user ID does not match the existing identity.",
      );

      await upsertOAuthToken(tx, existingIdentity.id, params.accessToken);
      return existingIdentity;
    }

    const accountIdentity = await tx
      .insertInto("account_identity")
      .values({
        account_id: params.accountId,
        provider: params.provider,
        provider_user_id: params.providerUserId,
        verified_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await upsertOAuthToken(tx, accountIdentity.id, params.accessToken);

    return accountIdentity;
  });
}

export async function disconnectOAuthIdentity(
  db: Database,
  accountId: string,
  provider: string,
) {
  assertOAuthProvider(provider);

  return await db
    .deleteFrom("account_identity")
    .where("account_id", "=", accountId)
    .where("provider", "=", provider)
    .executeTakeFirst();
}

export async function deleteEmailIdentity(
  db: Database,
  accountIdentityId: string,
) {
  return await db
    .deleteFrom("account_identity")
    .where("provider", "=", "email")
    .where("id", "=", accountIdentityId)
    .executeTakeFirst();
}

export async function countUsableLoginIdentities(
  db: Database,
  accountId: string,
) {
  const result = await db
    .selectFrom("account_identity")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .where("account_id", "=", accountId)
    .where((eb) =>
      eb.or([
        eb.and([
          eb("provider", "=", "email"),
          eb("verified_at", "is not", null),
          eb("password_hash", "is not", null),
        ]),
        eb("provider", "!=", "email"),
      ]),
    )
    .executeTakeFirstOrThrow();

  return Number(result.count);
}

type AccountIdentitySummary = Pick<
  Selectable<AccountIdentity>,
  | "created_at"
  | "email"
  | "pending_email"
  | "provider"
  | "provider_user_id"
  | "verified_at"
>;

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
    ])
    .where("account_id", "=", accountId)
    .orderBy("provider", "asc")
    .execute();
}

export async function getAccountIdentityByEmail(db: Database, email: string) {
  return await db
    .selectFrom("account_identity")
    .selectAll()
    .where("provider", "=", "email")
    .where("email", "=", email)
    .executeTakeFirst();
}

export async function updateAccountIdentityPendingEmail(
  db: Database,
  accountIdentityId: string,
  pendingEmail: string | null,
) {
  return await db
    .updateTable("account_identity")
    .set({ pending_email: pendingEmail, updated_at: new Date() })
    .where("provider", "=", "email")
    .where("id", "=", accountIdentityId)
    .executeTakeFirst();
}

export async function activatePendingAccountIdentityEmail(
  db: Database,
  accountIdentityId: string,
  email: string,
) {
  const now = new Date();
  return await db
    .updateTable("account_identity")
    .set({
      email,
      pending_email: null,
      provider_user_id: email,
      updated_at: now,
      verified_at: now,
    })
    .where("provider", "=", "email")
    .where("id", "=", accountIdentityId)
    .where("pending_email", "=", email)
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

export async function updateAccountIdentityPasswordHash(
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
