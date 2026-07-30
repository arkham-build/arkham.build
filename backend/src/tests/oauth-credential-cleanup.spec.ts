import { randomUUID } from "node:crypto";
import { describe, expect } from "vitest";
import type { Database } from "../db/db.ts";
import {
  cleanupExpiredOAuthCredentials,
  OAUTH_CREDENTIAL_AUDIT_RETENTION_MS,
} from "../features/oauth/lib/credential-cleanup.ts";
import { TEST_ACCOUNT, test } from "./test-utils.ts";

const NOW = new Date("2026-07-30T12:00:00.000Z");
const CUTOFF = new Date(NOW.getTime() - OAUTH_CREDENTIAL_AUDIT_RETENTION_MS);
const FUTURE_EXPIRY = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);

describe("OAuth credential retention cleanup", () => {
  test("deletes expired terminal records after the audit-retention period", async ({
    dependencies,
  }) => {
    const { db } = dependencies;
    const { clientId, grantId } = await seedOAuthOwner(db);
    const retainedExpiry = new Date(CUTOFF.getTime() + 1);
    const terminalAt = new Date(CUTOFF.getTime() - 60_000);

    const deletedRequestId = await seedAuthorizationRequest(
      db,
      clientId,
      CUTOFF,
      terminalAt,
    );
    const retainedRequestId = await seedAuthorizationRequest(
      db,
      clientId,
      retainedExpiry,
      terminalAt,
    );
    const activeRequestId = await seedAuthorizationRequest(
      db,
      clientId,
      FUTURE_EXPIRY,
    );

    const deletedCodeId = await seedAuthorizationCode(
      db,
      grantId,
      CUTOFF,
      terminalAt,
    );
    const retainedCodeId = await seedAuthorizationCode(
      db,
      grantId,
      retainedExpiry,
      terminalAt,
    );
    const activeCodeId = await seedAuthorizationCode(
      db,
      grantId,
      FUTURE_EXPIRY,
    );

    const deletedAccessParentId = await seedRefreshToken(
      db,
      grantId,
      FUTURE_EXPIRY,
    );
    const retainedAccessParentId = await seedRefreshToken(
      db,
      grantId,
      FUTURE_EXPIRY,
    );
    const activeAccessParentId = await seedRefreshToken(
      db,
      grantId,
      FUTURE_EXPIRY,
    );
    const deletedAccessId = await seedAccessToken(
      db,
      grantId,
      deletedAccessParentId,
      CUTOFF,
      terminalAt,
    );
    const retainedAccessId = await seedAccessToken(
      db,
      grantId,
      retainedAccessParentId,
      retainedExpiry,
      terminalAt,
    );
    const activeAccessId = await seedAccessToken(
      db,
      grantId,
      activeAccessParentId,
      FUTURE_EXPIRY,
    );

    const deletedRefreshId = await seedRefreshToken(db, grantId, CUTOFF, {
      rotatedAt: terminalAt,
    });
    const retainedRefreshId = await seedRefreshToken(
      db,
      grantId,
      retainedExpiry,
      { revokedAt: terminalAt },
    );
    const activeRefreshId = await seedRefreshToken(db, grantId, FUTURE_EXPIRY);

    const result = await cleanupExpiredOAuthCredentials(db, {
      batchSize: 100,
      maxBatches: 10,
      now: NOW,
    });

    expect(result).toEqual({
      batches: 1,
      continuationRequired: false,
      cutoff: CUTOFF,
      deleted: {
        accessTokens: 1,
        authorizationCodes: 1,
        authorizationRequests: 1,
        refreshTokens: 1,
      },
    });
    expect(
      await remainingIds(db, "oauth_authorization_request", [
        deletedRequestId,
        retainedRequestId,
        activeRequestId,
      ]),
    ).toEqual(new Set([retainedRequestId, activeRequestId]));
    expect(
      await remainingIds(db, "oauth_authorization_code", [
        deletedCodeId,
        retainedCodeId,
        activeCodeId,
      ]),
    ).toEqual(new Set([retainedCodeId, activeCodeId]));
    expect(
      await remainingIds(db, "oauth_access_token", [
        deletedAccessId,
        retainedAccessId,
        activeAccessId,
      ]),
    ).toEqual(new Set([retainedAccessId, activeAccessId]));
    expect(
      await remainingIds(db, "oauth_refresh_token", [
        deletedRefreshId,
        retainedRefreshId,
        activeRefreshId,
      ]),
    ).toEqual(new Set([retainedRefreshId, activeRefreshId]));
    expect(
      await db
        .selectFrom("oauth_grant")
        .select("id")
        .where("id", "=", grantId)
        .executeTakeFirst(),
    ).toEqual({ id: grantId });
    expect(
      await db
        .selectFrom("oauth_client")
        .select("id")
        .where("id", "=", clientId)
        .executeTakeFirst(),
    ).toEqual({ id: clientId });
  });

  test("bounds each table and drains the oldest records over repeated runs", async ({
    dependencies,
  }) => {
    const { db } = dependencies;
    const { clientId, grantId } = await seedOAuthOwner(db);
    const requestIds: string[] = [];
    const codeIds: string[] = [];
    const accessIds: string[] = [];
    const refreshIds: string[] = [];

    for (let index = 0; index < 5; index += 1) {
      const expiresAt = new Date(CUTOFF.getTime() - (5 - index) * 60_000);
      const accessParentId = await seedRefreshToken(db, grantId, FUTURE_EXPIRY);

      requestIds.push(await seedAuthorizationRequest(db, clientId, expiresAt));
      codeIds.push(await seedAuthorizationCode(db, grantId, expiresAt));
      accessIds.push(
        await seedAccessToken(db, grantId, accessParentId, expiresAt),
      );
      refreshIds.push(await seedRefreshToken(db, grantId, expiresAt));
    }

    const firstResult = await cleanupExpiredOAuthCredentials(db, {
      batchSize: 2,
      maxBatches: 2,
      now: NOW,
    });

    expect(firstResult.batches).toBe(2);
    expect(firstResult.continuationRequired).toBe(true);
    expect(firstResult.deleted).toEqual({
      accessTokens: 4,
      authorizationCodes: 4,
      authorizationRequests: 4,
      refreshTokens: 4,
    });
    expect(
      await remainingIds(db, "oauth_authorization_request", requestIds),
    ).toEqual(new Set([requestIds[4]]));
    expect(await remainingIds(db, "oauth_authorization_code", codeIds)).toEqual(
      new Set([codeIds[4]]),
    );
    expect(await remainingIds(db, "oauth_access_token", accessIds)).toEqual(
      new Set([accessIds[4]]),
    );
    expect(await remainingIds(db, "oauth_refresh_token", refreshIds)).toEqual(
      new Set([refreshIds[4]]),
    );

    const secondResult = await cleanupExpiredOAuthCredentials(db, {
      batchSize: 2,
      maxBatches: 1,
      now: NOW,
    });
    const thirdResult = await cleanupExpiredOAuthCredentials(db, {
      batchSize: 2,
      maxBatches: 1,
      now: NOW,
    });

    expect(secondResult.continuationRequired).toBe(false);
    expect(secondResult.deleted).toEqual({
      accessTokens: 1,
      authorizationCodes: 1,
      authorizationRequests: 1,
      refreshTokens: 1,
    });
    expect(thirdResult.deleted).toEqual({
      accessTokens: 0,
      authorizationCodes: 0,
      authorizationRequests: 0,
      refreshTokens: 0,
    });
  });

  test("does not cascade-delete a retained access token", async ({
    dependencies,
  }) => {
    const { db } = dependencies;
    const { grantId } = await seedOAuthOwner(db);
    const expiredAt = new Date(CUTOFF.getTime() - 1);
    const retainedAt = new Date(CUTOFF.getTime() + 1);
    const blockedRefreshId = await seedRefreshToken(db, grantId, expiredAt);
    const retainedAccessId = await seedAccessToken(
      db,
      grantId,
      blockedRefreshId,
      retainedAt,
    );
    const deletedRefreshId = await seedRefreshToken(db, grantId, expiredAt);
    const deletedAccessId = await seedAccessToken(
      db,
      grantId,
      deletedRefreshId,
      expiredAt,
    );

    const result = await cleanupExpiredOAuthCredentials(db, {
      batchSize: 100,
      maxBatches: 10,
      now: NOW,
    });

    expect(result.deleted).toEqual({
      accessTokens: 1,
      authorizationCodes: 0,
      authorizationRequests: 0,
      refreshTokens: 1,
    });
    expect(
      await remainingIds(db, "oauth_refresh_token", [
        blockedRefreshId,
        deletedRefreshId,
      ]),
    ).toEqual(new Set([blockedRefreshId]));
    expect(
      await remainingIds(db, "oauth_access_token", [
        retainedAccessId,
        deletedAccessId,
      ]),
    ).toEqual(new Set([retainedAccessId]));
  });
});

async function seedOAuthOwner(db: Database) {
  const account = await db
    .selectFrom("account")
    .select("id")
    .where("name", "=", TEST_ACCOUNT.name)
    .executeTakeFirstOrThrow();
  const client = await db
    .insertInto("oauth_client")
    .values({
      name: "Cleanup test client",
      secret_hash: randomUUID(),
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  const grant = await db
    .insertInto("oauth_grant")
    .values({
      account_id: account.id,
      oauth_client_id: client.id,
      scopes: ["profile:read"],
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return { clientId: client.id, grantId: grant.id };
}

async function seedAuthorizationRequest(
  db: Database,
  clientId: string,
  expiresAt: Date,
  consumedAt: Date | null = null,
) {
  const request = await db
    .insertInto("oauth_authorization_request")
    .values({
      consumed_at: consumedAt,
      decision: consumedAt ? "denied" : null,
      expires_at: expiresAt,
      oauth_client_id: clientId,
      redirect_uri: "https://example.com/oauth/callback",
      request_token_hash: randomUUID(),
      scopes: ["profile:read"],
      state: randomUUID(),
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return request.id;
}

async function seedAuthorizationCode(
  db: Database,
  grantId: string,
  expiresAt: Date,
  usedAt: Date | null = null,
) {
  const code = await db
    .insertInto("oauth_authorization_code")
    .values({
      code_hash: randomUUID(),
      expires_at: expiresAt,
      oauth_grant_id: grantId,
      redirect_uri: "https://example.com/oauth/callback",
      scopes: ["profile:read"],
      used_at: usedAt,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return code.id;
}

async function seedRefreshToken(
  db: Database,
  grantId: string,
  expiresAt: Date,
  status: Readonly<{
    revokedAt?: Date;
    rotatedAt?: Date;
  }> = {},
) {
  const refreshToken = await db
    .insertInto("oauth_refresh_token")
    .values({
      expires_at: expiresAt,
      oauth_grant_id: grantId,
      revoked_at: status.revokedAt ?? null,
      rotated_at: status.rotatedAt ?? null,
      scopes: ["profile:read"],
      token_hash: randomUUID(),
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return refreshToken.id;
}

async function seedAccessToken(
  db: Database,
  grantId: string,
  refreshTokenId: string,
  expiresAt: Date,
  revokedAt: Date | null = null,
) {
  const accessToken = await db
    .insertInto("oauth_access_token")
    .values({
      expires_at: expiresAt,
      oauth_grant_id: grantId,
      oauth_refresh_token_id: refreshTokenId,
      revoked_at: revokedAt,
      scopes: ["profile:read"],
      token_hash: randomUUID(),
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return accessToken.id;
}

type OAuthCredentialTable =
  | "oauth_access_token"
  | "oauth_authorization_code"
  | "oauth_authorization_request"
  | "oauth_refresh_token";

async function remainingIds(
  db: Database,
  table: OAuthCredentialTable,
  ids: readonly string[],
) {
  const rows = await db
    .selectFrom(table)
    .select("id")
    .where("id", "in", ids)
    .execute();

  return new Set(rows.map((row) => row.id));
}
