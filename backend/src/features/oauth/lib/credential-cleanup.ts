import assert from "node:assert/strict";
import type { Transaction } from "kysely";
import type { Database } from "../../../db/db.ts";
import type { DB } from "../../../db/schema.types.ts";

export const OAUTH_CREDENTIAL_AUDIT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const OAUTH_CREDENTIAL_CLEANUP_BATCH_SIZE = 1_000;
export const OAUTH_CREDENTIAL_CLEANUP_MAX_BATCHES_PER_RUN = 10;

export type OAuthCredentialCleanupResult = {
  batches: number;
  continuationRequired: boolean;
  cutoff: Date;
  deleted: {
    accessTokens: number;
    authorizationCodes: number;
    authorizationRequests: number;
    refreshTokens: number;
  };
};

type OAuthCredentialCleanupInput = Readonly<{
  batchSize: number;
  maxBatches: number;
  now: Date;
}>;

export async function cleanupExpiredOAuthCredentials(
  db: Database,
  input: OAuthCredentialCleanupInput,
): Promise<OAuthCredentialCleanupResult> {
  assertCleanupLimits(input);

  const cutoff = new Date(
    input.now.getTime() - OAUTH_CREDENTIAL_AUDIT_RETENTION_MS,
  );
  let batches = 0;
  let continuationRequired = true;
  let deleted = emptyDeletedCounts();

  while (batches < input.maxBatches && continuationRequired) {
    const batchDeleted = await cleanupExpiredOAuthCredentialBatch(
      db,
      cutoff,
      input.batchSize,
    );

    batches += 1;
    deleted = addDeletedCounts(deleted, batchDeleted);
    continuationRequired = hasFullBatch(batchDeleted, input.batchSize);
  }

  return { batches, continuationRequired, cutoff, deleted };
}

async function cleanupExpiredOAuthCredentialBatch(
  db: Database,
  cutoff: Date,
  batchSize: number,
): Promise<OAuthCredentialDeletedCounts> {
  return await db.transaction().execute(async (tx) => {
    const authorizationRequests = await deleteExpiredAuthorizationRequests(
      tx,
      cutoff,
      batchSize,
    );
    const authorizationCodes = await deleteExpiredAuthorizationCodes(
      tx,
      cutoff,
      batchSize,
    );
    const accessTokens = await deleteExpiredAccessTokens(tx, cutoff, batchSize);
    const refreshTokens = await deleteExpiredRefreshTokens(
      tx,
      cutoff,
      batchSize,
    );

    return {
      accessTokens,
      authorizationCodes,
      authorizationRequests,
      refreshTokens,
    };
  });
}

type OAuthCredentialDeletedCounts = OAuthCredentialCleanupResult["deleted"];

function assertCleanupLimits(input: OAuthCredentialCleanupInput) {
  assert(
    Number.isInteger(input.batchSize) &&
      input.batchSize > 0 &&
      input.batchSize <= OAUTH_CREDENTIAL_CLEANUP_BATCH_SIZE,
    `OAuth credential cleanup batch size must be between 1 and ${OAUTH_CREDENTIAL_CLEANUP_BATCH_SIZE}`,
  );
  assert(
    Number.isInteger(input.maxBatches) &&
      input.maxBatches > 0 &&
      input.maxBatches <= OAUTH_CREDENTIAL_CLEANUP_MAX_BATCHES_PER_RUN,
    `OAuth credential cleanup batch count must be between 1 and ${OAUTH_CREDENTIAL_CLEANUP_MAX_BATCHES_PER_RUN}`,
  );
}

function emptyDeletedCounts(): OAuthCredentialDeletedCounts {
  return {
    accessTokens: 0,
    authorizationCodes: 0,
    authorizationRequests: 0,
    refreshTokens: 0,
  };
}

function addDeletedCounts(
  total: OAuthCredentialDeletedCounts,
  batch: OAuthCredentialDeletedCounts,
): OAuthCredentialDeletedCounts {
  return {
    accessTokens: total.accessTokens + batch.accessTokens,
    authorizationCodes: total.authorizationCodes + batch.authorizationCodes,
    authorizationRequests:
      total.authorizationRequests + batch.authorizationRequests,
    refreshTokens: total.refreshTokens + batch.refreshTokens,
  };
}

function hasFullBatch(
  deleted: OAuthCredentialDeletedCounts,
  batchSize: number,
) {
  return Object.values(deleted).some((count) => count === batchSize);
}

async function deleteExpiredAuthorizationRequests(
  tx: Transaction<DB>,
  cutoff: Date,
  batchSize: number,
) {
  const candidates = await tx
    .selectFrom("oauth_authorization_request")
    .select("id")
    .where("expires_at", "<=", cutoff)
    .orderBy("expires_at")
    .orderBy("id")
    .limit(batchSize)
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
  batchSize: number,
) {
  const candidates = await tx
    .selectFrom("oauth_authorization_code")
    .select("id")
    .where("expires_at", "<=", cutoff)
    .orderBy("expires_at")
    .orderBy("id")
    .limit(batchSize)
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

async function deleteExpiredAccessTokens(
  tx: Transaction<DB>,
  cutoff: Date,
  batchSize: number,
) {
  const candidates = await tx
    .selectFrom("oauth_access_token")
    .select("id")
    .where("expires_at", "<=", cutoff)
    .orderBy("expires_at")
    .orderBy("id")
    .limit(batchSize)
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

async function deleteExpiredRefreshTokens(
  tx: Transaction<DB>,
  cutoff: Date,
  batchSize: number,
) {
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
    .limit(batchSize)
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
