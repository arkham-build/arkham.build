import type { Database } from "../../db/db.ts";
import type { AccessToken } from "../../lib/arkhamdb/types.ts";
import { upsertOAuthToken } from "../../lib/common-queries.ts";
import type { Config } from "../../lib/config.ts";

export interface CreateAccountParams {
  name: string;
  email: string;
  passwordHash: string;
}

export interface CreateAccountFromOAuthParams {
  accessToken: AccessToken;
  config: Config;
  provider: string;
  providerUserId: string;
}

export async function createAccount(db: Database, params: CreateAccountParams) {
  return await db.transaction().execute(async (tx) => {
    const account = await tx
      .insertInto("account")
      .values({ name: params.name })
      .returningAll()
      .executeTakeFirstOrThrow();

    const accountIdentity = await tx
      .insertInto("account_identity")
      .values({
        account_id: account.id,
        provider: "email",
        provider_user_id: params.email,
        email: params.email,
        password_hash: params.passwordHash,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { account, accountIdentity };
  });
}

export async function getAccount(db: Database, id: string) {
  return await db
    .selectFrom("account")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export async function updateAccountName(
  db: Database,
  accountId: string,
  name: string,
) {
  const now = new Date();
  return await db
    .updateTable("account")
    .set({ name, updated_at: now })
    .where("id", "=", accountId)
    .executeTakeFirst();
}

export async function upsertAccountFromOAuth(
  db: Database,
  params: CreateAccountFromOAuthParams,
) {
  return await db.transaction().execute(async (tx) => {
    let accountIdentity = await getAccountIdentityByUserProviderId(
      tx,
      "arkhamdb",
      params.providerUserId,
    );

    const existing = !!accountIdentity;

    if (!accountIdentity) {
      const account = await tx
        .insertInto("account")
        .values({ name: `provider_${params.providerUserId}` })
        .returningAll()
        .executeTakeFirstOrThrow();

      accountIdentity = await tx
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: params.provider,
          provider_user_id: params.providerUserId,
          verified_at: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    await upsertOAuthToken(tx, accountIdentity.id, params.accessToken);

    const session = await createSession(
      tx,
      accountIdentity.account_id,
      params.config.SESSION_EXPIRY_HOURS,
    );

    return { session, existing };
  });
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

export async function getAccountIdentityByUserProviderId(
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

export async function deleteSessionsByAccountId(
  db: Database,
  accountId: string,
) {
  return await db
    .deleteFrom("session")
    .where("account_id", "=", accountId)
    .executeTakeFirst();
}

export async function getSession(db: Database, id: string) {
  return await db
    .selectFrom("session")
    .selectAll()
    .where("id", "=", id)
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

export interface CreateVerificationTokenParams {
  accountIdentityId: string | null;
  email: string;
  tokenHash: string;
  tokenType: "email_verification" | "password_reset";
  expiryHours: number;
}

export async function createVerificationToken(
  db: Database,
  params: CreateVerificationTokenParams,
) {
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + params.expiryHours * 60 * 60 * 1000,
  );

  return await db
    .insertInto("verification_token")
    .values({
      account_identity_id: params.accountIdentityId,
      email: params.email,
      token_hash: params.tokenHash,
      token_type: params.tokenType,
      created_at: now,
      expires_at: expiresAt,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteVerificationTokensByEmail(
  db: Database,
  email: string,
  tokenType: "email_verification" | "password_reset",
) {
  return await db
    .deleteFrom("verification_token")
    .where("email", "=", email)
    .where("token_type", "=", tokenType)
    .executeTakeFirst();
}

export async function consumeVerificationToken(
  db: Database,
  tokenHash: string,
  tokenType: "email_verification" | "password_reset",
) {
  return await db
    .deleteFrom("verification_token")
    .returningAll()
    .where("token_hash", "=", tokenHash)
    .where("token_type", "=", tokenType)
    .where("expires_at", ">", new Date())
    .executeTakeFirst();
}

export async function getLatestVerificationTokenByEmail(
  db: Database,
  email: string,
  tokenType: "email_verification" | "password_reset",
) {
  return await db
    .selectFrom("verification_token")
    .selectAll()
    .where("email", "=", email)
    .where("token_type", "=", tokenType)
    .orderBy("created_at", "desc")
    .executeTakeFirst();
}
