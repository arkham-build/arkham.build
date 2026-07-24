import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { describe, expect, vi } from "vitest";
import { z } from "zod";
import type { appFactory } from "../app.ts";
import type { Database } from "../db/db.ts";
import {
  oauthBearerAuth,
  OAuthUserErrorSchema,
} from "../features/oauth-user/bearer-auth.ts";
import { OAuthProfileResponseSchema } from "../features/oauth-user/routes.ts";
import { OAuthErrorResponseSchema } from "../features/oauth/lib/errors.ts";
import {
  generateOAuthAccessToken,
  generateOAuthClientSecret,
  generateOAuthRefreshToken,
  hashOAuthClientSecret,
  hashOAuthCredential,
} from "../lib/oauth/crypto.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import { TEST_ACCOUNT, test } from "./test-utils.ts";

describe("authenticated OAuth profile lifecycle", () => {
  test("returns the minimal profile DTO and updates token activity", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const now = new Date("2026-07-23T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const credentials = await seedOAuthCredentials(db);

    const response = await profileRequest(app, credentials.accessToken);
    const body = OAuthProfileResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: credentials.accountId,
      username: TEST_ACCOUNT.name,
    });
    expect(JSON.stringify(body)).not.toContain(TEST_ACCOUNT.email);
    expect(
      await db
        .selectFrom("oauth_access_token")
        .select("last_used_at")
        .where("id", "=", credentials.accessTokenId)
        .executeTakeFirstOrThrow(),
    ).toEqual({ last_used_at: now });
  });

  test("enforces required scopes without recording failed token use", async ({
    dependencies,
  }) => {
    const { db } = dependencies;
    const credentials = await seedOAuthCredentials(db);
    const scopedApp = new Hono<HonoEnv>();
    scopedApp.use(async (c, next) => {
      c.set("db", db);
      await next();
    });
    scopedApp.get("/decks", oauthBearerAuth(["decks:write"]), (c) =>
      c.json({ ok: true }),
    );

    const response = await scopedApp.request("/decks", {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    expect(response.status).toBe(403);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      'Bearer error="insufficient_scope", scope="decks:write"',
    );
    expect(OAuthUserErrorSchema.parse(await response.json())).toEqual({
      error: "insufficient_scope",
      message: "This endpoint requires decks:write",
    });
    expect(
      await db
        .selectFrom("oauth_access_token")
        .select("last_used_at")
        .where("id", "=", credentials.accessTokenId)
        .executeTakeFirstOrThrow(),
    ).toEqual({ last_used_at: null });
  });

  test("rejects missing, malformed, unknown, expired, and revoked tokens", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const credentials = await seedOAuthCredentials(db);

    await expectUserError(
      await app.request("/v2/user/me"),
      401,
      "invalid_token",
    );
    await expectUserError(
      await app.request("/v2/user/me", {
        headers: { Authorization: `Basic ${credentials.accessToken}` },
      }),
      401,
      "invalid_token",
    );
    await expectUserError(
      await profileRequest(app, generateOAuthAccessToken()),
      401,
      "invalid_token",
    );

    await db
      .updateTable("oauth_access_token")
      .set({ expires_at: new Date(Date.now() - 1) })
      .where("id", "=", credentials.accessTokenId)
      .execute();
    await expectUserError(
      await profileRequest(app, credentials.accessToken),
      401,
      "invalid_token",
    );

    await db
      .updateTable("oauth_access_token")
      .set({
        expires_at: new Date(Date.now() + 60_000),
        revoked_at: new Date(),
      })
      .where("id", "=", credentials.accessTokenId)
      .execute();
    await expectUserError(
      await profileRequest(app, credentials.accessToken),
      401,
      "invalid_token",
    );
  });

  test("rejects disabled clients, banned accounts, and deleted accounts", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const credentials = await seedOAuthCredentials(db);

    await db
      .updateTable("oauth_client")
      .set({ disabled_at: new Date() })
      .where("id", "=", credentials.clientId)
      .execute();
    await expectUserError(
      await profileRequest(app, credentials.accessToken),
      401,
      "invalid_token",
    );

    await db
      .updateTable("oauth_client")
      .set({ disabled_at: null })
      .where("id", "=", credentials.clientId)
      .execute();
    await db
      .insertInto("account_moderation_action")
      .values({
        account_id: credentials.accountId,
        reason: "OAuth bearer test ban",
        scope: "account",
        type: "ban",
      })
      .execute();
    await expectUserError(
      await profileRequest(app, credentials.accessToken),
      403,
      "account_banned",
    );

    await db
      .deleteFrom("account_moderation_action")
      .where("account_id", "=", credentials.accountId)
      .execute();
    await db
      .deleteFrom("account")
      .where("id", "=", credentials.accountId)
      .execute();
    await expectUserError(
      await profileRequest(app, credentials.accessToken),
      401,
      "invalid_token",
    );
  });

  test("revokes one access token idempotently without revoking its siblings", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const credentials = await seedOAuthCredentials(db);
    const sibling = await insertAccessToken(
      db,
      credentials.grantId,
      credentials.refreshTokenId,
    );

    const firstResponse = await revocationRequest(app, credentials, {
      token: credentials.accessToken,
      token_type_hint: "access_token",
    });
    expect(firstResponse.status).toBe(200);
    expect(await firstResponse.text()).toBe("");
    expectNoStoreHeaders(firstResponse);

    const secondResponse = await revocationRequest(app, credentials, {
      token: credentials.accessToken,
      token_type_hint: "access_token",
    });
    expect(secondResponse.status).toBe(200);
    expectNoStoreHeaders(secondResponse);

    const tokens = await db
      .selectFrom("oauth_access_token")
      .select(["id", "revoked_at"])
      .where("id", "in", [credentials.accessTokenId, sibling.id])
      .orderBy("id")
      .execute();
    expect(
      tokens.find((token) => token.id === credentials.accessTokenId),
    ).toMatchObject({ revoked_at: expect.any(Date) });
    expect(tokens.find((token) => token.id === sibling.id)).toMatchObject({
      revoked_at: null,
    });
    await expectUserError(
      await profileRequest(app, credentials.accessToken),
      401,
      "invalid_token",
    );
    expect((await profileRequest(app, sibling.rawToken)).status).toBe(200);
  });

  test("revokes a refresh token and every access token issued from it", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const credentials = await seedOAuthCredentials(db);
    const sibling = await insertAccessToken(
      db,
      credentials.grantId,
      credentials.refreshTokenId,
    );
    const otherRefresh = await insertRefreshToken(db, credentials.grantId);
    const unrelatedAccess = await insertAccessToken(
      db,
      credentials.grantId,
      otherRefresh.id,
    );

    const response = await revocationRequest(app, credentials, {
      token: credentials.refreshToken,
      token_type_hint: "refresh_token",
    });
    expect(response.status).toBe(200);
    expectNoStoreHeaders(response);

    const revokedRefresh = await db
      .selectFrom("oauth_refresh_token")
      .select("revoked_at")
      .where("id", "=", credentials.refreshTokenId)
      .executeTakeFirstOrThrow();
    expect(revokedRefresh.revoked_at).toEqual(expect.any(Date));

    const linkedTokens = await db
      .selectFrom("oauth_access_token")
      .select(["id", "revoked_at"])
      .where("id", "in", [
        credentials.accessTokenId,
        sibling.id,
        unrelatedAccess.id,
      ])
      .execute();
    expect(
      linkedTokens
        .filter((token) => token.id !== unrelatedAccess.id)
        .every((token) => token.revoked_at != null),
    ).toBe(true);
    expect(
      linkedTokens.find((token) => token.id === unrelatedAccess.id)?.revoked_at,
    ).toBeNull();
  });

  test("keeps unknown and cross-client tokens private", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const owner = await seedOAuthCredentials(db);
    const otherClient = await seedOAuthClient(db, "Other OAuth client");

    for (const token of [owner.accessToken, generateOAuthAccessToken()]) {
      const response = await revocationRequest(app, otherClient, { token });
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("");
      expectNoStoreHeaders(response);
    }

    expect(
      await db
        .selectFrom("oauth_access_token")
        .select("revoked_at")
        .where("id", "=", owner.accessTokenId)
        .executeTakeFirstOrThrow(),
    ).toEqual({ revoked_at: null });
  });

  test("authenticates active revocation clients and returns no-store errors", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const credentials = await seedOAuthCredentials(db);

    const badSecretResponse = await revocationRequest(
      app,
      { ...credentials, clientSecret: "ab_cs_wrong" },
      { token: credentials.accessToken },
    );
    await expectOAuthError(badSecretResponse, 401, "invalid_client");
    expectNoStoreHeaders(badSecretResponse);

    const authorizationResponse = await app.request("/v2/oauth/revoke", {
      method: "POST",
      headers: {
        Authorization: "Basic ignored",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        token: credentials.accessToken,
      }).toString(),
    });
    await expectOAuthError(authorizationResponse, 401, "invalid_client");
    expectNoStoreHeaders(authorizationResponse);

    await db
      .updateTable("oauth_client")
      .set({ disabled_at: new Date() })
      .where("id", "=", credentials.clientId)
      .execute();
    const disabledResponse = await revocationRequest(app, credentials, {
      token: credentials.accessToken,
    });
    await expectOAuthError(disabledResponse, 400, "unauthorized_client");
    expectNoStoreHeaders(disabledResponse);

    const malformedResponse = await app.request("/v2/oauth/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    await expectOAuthError(malformedResponse, 400, "invalid_request");
    expectNoStoreHeaders(malformedResponse);
  });
});

type App = ReturnType<typeof appFactory>;
type OAuthClientCredentials = {
  clientId: string;
  clientSecret: string;
};

async function seedOAuthCredentials(db: Database) {
  const client = await seedOAuthClient(db, "OAuth lifecycle test client");
  const account = await db
    .selectFrom("account")
    .select("id")
    .where("name", "=", TEST_ACCOUNT.name)
    .executeTakeFirstOrThrow();
  const grant = await db
    .insertInto("oauth_grant")
    .values({
      account_id: account.id,
      oauth_client_id: client.clientId,
      scopes: ["profile:read"],
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  const refreshToken = await insertRefreshToken(db, grant.id);
  const accessToken = await insertAccessToken(db, grant.id, refreshToken.id);

  return {
    ...client,
    accessToken: accessToken.rawToken,
    accessTokenId: accessToken.id,
    accountId: account.id,
    grantId: grant.id,
    refreshToken: refreshToken.rawToken,
    refreshTokenId: refreshToken.id,
  };
}

async function seedOAuthClient(db: Database, name: string) {
  const clientId = randomUUID();
  const clientSecret = generateOAuthClientSecret();
  await db
    .insertInto("oauth_client")
    .values({
      id: clientId,
      name,
      secret_hash: await hashOAuthClientSecret(clientSecret),
    })
    .execute();
  return { clientId, clientSecret };
}

async function insertRefreshToken(db: Database, grantId: string) {
  const rawToken = generateOAuthRefreshToken();
  const token = await db
    .insertInto("oauth_refresh_token")
    .values({
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      oauth_grant_id: grantId,
      scopes: ["profile:read"],
      token_hash: hashOAuthCredential(rawToken),
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return { id: token.id, rawToken };
}

async function insertAccessToken(
  db: Database,
  grantId: string,
  refreshTokenId: string,
) {
  const rawToken = generateOAuthAccessToken();
  const token = await db
    .insertInto("oauth_access_token")
    .values({
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      oauth_grant_id: grantId,
      oauth_refresh_token_id: refreshTokenId,
      scopes: ["profile:read"],
      token_hash: hashOAuthCredential(rawToken),
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return { id: token.id, rawToken };
}

async function profileRequest(app: App, token: string) {
  return await app.request("/v2/user/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function revocationRequest(
  app: App,
  client: OAuthClientCredentials,
  fields: { token: string; token_type_hint?: string },
) {
  return await app.request("/v2/oauth/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: client.clientId,
      client_secret: client.clientSecret,
      ...fields,
    }).toString(),
  });
}

async function expectUserError(
  response: Response,
  status: 401 | 403,
  error: z.infer<typeof OAuthUserErrorSchema>["error"],
) {
  expect(response.status).toBe(status);
  expect(response.headers.get("WWW-Authenticate")).toMatch(/^Bearer/);
  expect(OAuthUserErrorSchema.parse(await response.json())).toMatchObject({
    error,
  });
}

async function expectOAuthError(
  response: Response,
  status: 400 | 401,
  error: z.infer<typeof OAuthErrorResponseSchema>["error"],
) {
  expect(response.status).toBe(status);
  expect(OAuthErrorResponseSchema.parse(await response.json())).toMatchObject({
    error,
  });
}

function expectNoStoreHeaders(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Pragma")).toBe("no-cache");
}
