import assert from "node:assert";
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
  const account = await db
    .insertInto("account")
    .values({ name: params.name })
    .returningAll()
    .executeTakeFirstOrThrow();

  const accountIdentity = await db
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
}

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

export async function getAccount(db: Database, id: string) {
  return await db
    .selectFrom("account")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export async function accountNameExists(
  db: Database,
  name: string,
  excludeAccountId?: string,
) {
  let query = db.selectFrom("account").select(["id"]).where("name", "=", name);

  if (excludeAccountId) {
    query = query.where("id", "!=", excludeAccountId);
  }

  return (await query.executeTakeFirst()) != null;
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
    let accountIdentity = await getAccountIdentityByProviderUserId(
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
  accessToken: AccessToken;
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

export async function getIdentitiesByAccountId(
  db: Database,
  accountId: string,
) {
  const identities = await db
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

  return identities.map((identity) => {
    if (identity.provider === "email") {
      return {
        provider: "email" as const,
        email: identity.email,
        pendingEmail: identity.pending_email,
        verified: identity.verified_at != null,
      };
    }

    if (identity.provider === "arkhamdb") {
      return {
        provider: "arkhamdb" as const,
        providerUserId: identity.provider_user_id,
        details: {
          status: "healthy" as const,
          createdAt: identity.created_at.toISOString(),
          lastSyncedAt: null,
          username: null,
        },
      };
    }

    return {
      provider: identity.provider,
      providerUserId: identity.provider_user_id,
    };
  });
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

export async function replaceVerificationToken(
  db: Database,
  params: CreateVerificationTokenParams,
) {
  await deleteVerificationTokensByEmail(db, params.email, params.tokenType);
  return await createVerificationToken(db, params);
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

export async function deleteVerificationTokensByAccountIdentityIdAndEmail(
  db: Database,
  accountIdentityId: string,
  email: string,
  tokenType: "email_verification" | "password_reset",
) {
  return await db
    .deleteFrom("verification_token")
    .where("account_identity_id", "=", accountIdentityId)
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

export async function getVerificationTokenByHash(
  db: Database,
  tokenHash: string,
  tokenType: "email_verification" | "password_reset",
) {
  return await db
    .selectFrom("verification_token")
    .selectAll()
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
