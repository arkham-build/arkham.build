import type { Transaction } from "kysely";
import type { Database } from "../../../db/db.ts";
import type { DB } from "../../../db/schema.types.ts";

export async function cleanupExpiredOAuthCredentials(db: Database, now: Date) {
  const cutoff = new Date(now.getTime() - OAUTH_CREDENTIAL_AUDIT_RETENTION_MS);
  const deleted = await db.transaction().execute(async (tx) => {
    const authorizationRequests = await deleteExpiredAuthorizationRequests(
      tx,
      cutoff,
    );
    const authorizationCodes = await deleteExpiredAuthorizationCodes(
      tx,
      cutoff,
    );
    const accessTokens = await deleteExpiredAccessTokens(tx, cutoff);
    const refreshTokens = await deleteExpiredRefreshTokens(tx, cutoff);

    return {
      accessTokens,
      authorizationCodes,
      authorizationRequests,
      refreshTokens,
    };
  });

  return { cutoff, deleted };
}

const OAUTH_CREDENTIAL_AUDIT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const OAUTH_CREDENTIAL_CLEANUP_BATCH_SIZE = 1_000;

async function deleteExpiredAuthorizationRequests(
  tx: Transaction<DB>,
  cutoff: Date,
) {
  const candidates = await tx
    .selectFrom("oauth_authorization_request")
    .select("id")
    .where("expires_at", "<=", cutoff)
    .orderBy("expires_at")
    .orderBy("id")
    .limit(OAUTH_CREDENTIAL_CLEANUP_BATCH_SIZE)
    .forUpdate()
    .skipLocked()
    .execute();

  if (candidates.length === 0) return 0;

  const deleted = await tx
    .deleteFrom("oauth_authorization_request")
    .where(
      "id",
      "in",
      candidates.map((candidate) => candidate.id),
    )
    .returning("id")
    .execute();

  return deleted.length;
}

async function deleteExpiredAuthorizationCodes(
  tx: Transaction<DB>,
  cutoff: Date,
) {
  const candidates = await tx
    .selectFrom("oauth_authorization_code")
    .select("id")
    .where("expires_at", "<=", cutoff)
    .orderBy("expires_at")
    .orderBy("id")
    .limit(OAUTH_CREDENTIAL_CLEANUP_BATCH_SIZE)
    .forUpdate()
    .skipLocked()
    .execute();

  if (candidates.length === 0) return 0;

  const deleted = await tx
    .deleteFrom("oauth_authorization_code")
    .where(
      "id",
      "in",
      candidates.map((candidate) => candidate.id),
    )
    .returning("id")
    .execute();

  return deleted.length;
}

async function deleteExpiredAccessTokens(tx: Transaction<DB>, cutoff: Date) {
  const candidates = await tx
    .selectFrom("oauth_access_token")
    .select("id")
    .where("expires_at", "<=", cutoff)
    .orderBy("expires_at")
    .orderBy("id")
    .limit(OAUTH_CREDENTIAL_CLEANUP_BATCH_SIZE)
    .forUpdate()
    .skipLocked()
    .execute();

  if (candidates.length === 0) return 0;

  const deleted = await tx
    .deleteFrom("oauth_access_token")
    .where(
      "id",
      "in",
      candidates.map((candidate) => candidate.id),
    )
    .returning("id")
    .execute();

  return deleted.length;
}

async function deleteExpiredRefreshTokens(tx: Transaction<DB>, cutoff: Date) {
  const candidates = await tx
    .selectFrom("oauth_refresh_token")
    .leftJoin(
      "oauth_access_token",
      "oauth_access_token.oauth_refresh_token_id",
      "oauth_refresh_token.id",
    )
    .select("oauth_refresh_token.id")
    .where("oauth_refresh_token.expires_at", "<=", cutoff)
    .where("oauth_access_token.id", "is", null)
    .orderBy("oauth_refresh_token.expires_at")
    .orderBy("oauth_refresh_token.id")
    .limit(OAUTH_CREDENTIAL_CLEANUP_BATCH_SIZE)
    .forUpdate("oauth_refresh_token")
    .skipLocked()
    .execute();

  if (candidates.length === 0) return 0;

  const deleted = await tx
    .deleteFrom("oauth_refresh_token")
    .where(
      "id",
      "in",
      candidates.map((candidate) => candidate.id),
    )
    .returning("id")
    .execute();

  return deleted.length;
}
