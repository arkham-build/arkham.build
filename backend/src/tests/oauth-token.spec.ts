import { createHash, randomUUID } from "node:crypto";
import { describe, expect, vi } from "vitest";
import { z } from "zod";
import type { appFactory } from "../app.ts";
import type { Database } from "../db/db.ts";
import {
  generateOAuthClientSecret,
  hashOAuthClientSecret,
} from "../lib/oauth/crypto.ts";
import { OAuthErrorResponseSchema } from "../features/oauth/dtos.ts";
import {
  OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  OAUTH_REFRESH_TOKEN_LIFETIME_MS,
  OAUTH_REFRESH_TOKEN_ROTATION_GRACE_MS,
} from "../features/oauth/lib/token-exchange.ts";
import { TEST_ACCOUNT, test } from "./test-utils.ts";

const REDIRECT_URI = "https://example.com/oauth/callback";
const TokenResponseSchema = z
  .object({
    token_type: z.literal("Bearer"),
    access_token: z.string().startsWith("ab_at_"),
    expires_in: z.literal(3600),
    refresh_token: z.string().startsWith("ab_rt_"),
    scope: z.string(),
  })
  .strict();

describe("POST /v2/oauth/token", () => {
  test("exchanges a code once with exact scopes and hashed fixed-lifetime tokens", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    const now = new Date("2026-07-22T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const client = await seedOAuthClient(db);
    const code = await issueAuthorizationCode(
      app,
      sessionCookie,
      client.id,
      "profile:read",
    );
    const grant = await db
      .selectFrom("oauth_grant")
      .selectAll()
      .where("oauth_client_id", "=", client.id)
      .executeTakeFirstOrThrow();
    await db
      .updateTable("oauth_grant")
      .set({
        scopes: ["profile:read", "decks:read", "decks:write"],
      })
      .where("id", "=", grant.id)
      .execute();

    const response = await tokenRequest(app, {
      grant_type: "authorization_code",
      client_id: client.id,
      client_secret: client.secret,
      code,
      redirect_uri: REDIRECT_URI,
    });
    const body = TokenResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expectNoStoreHeaders(response);
    expect(body).toMatchObject({
      token_type: "Bearer",
      expires_in: OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      scope: "profile:read",
    });
    expect(body.access_token).toMatch(/^ab_at_[A-Za-z0-9_-]{43}$/);
    expect(body.refresh_token).toMatch(/^ab_rt_[A-Za-z0-9_-]{43}$/);

    const storedCode = await db
      .selectFrom("oauth_authorization_code")
      .selectAll()
      .where("code_hash", "=", sha256(code))
      .executeTakeFirstOrThrow();
    const storedRefreshToken = await db
      .selectFrom("oauth_refresh_token")
      .selectAll()
      .executeTakeFirstOrThrow();
    const storedAccessToken = await db
      .selectFrom("oauth_access_token")
      .selectAll()
      .executeTakeFirstOrThrow();
    const storedClient = await db
      .selectFrom("oauth_client")
      .selectAll()
      .where("id", "=", client.id)
      .executeTakeFirstOrThrow();

    expect(storedCode.used_at).toEqual(now);
    expect(storedRefreshToken).toMatchObject({
      expires_at: new Date(now.getTime() + OAUTH_REFRESH_TOKEN_LIFETIME_MS),
      oauth_grant_id: grant.id,
      scopes: ["profile:read"],
      token_hash: sha256(body.refresh_token),
    });
    expect(storedAccessToken).toMatchObject({
      expires_at: new Date(
        now.getTime() + OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS * 1000,
      ),
      oauth_grant_id: grant.id,
      oauth_refresh_token_id: storedRefreshToken.id,
      scopes: ["profile:read"],
      token_hash: sha256(body.access_token),
    });

    const serializedStorage = JSON.stringify({
      storedAccessToken,
      storedClient,
      storedCode,
      storedRefreshToken,
    });
    for (const rawValue of [
      client.secret,
      code,
      body.access_token,
      body.refresh_token,
    ]) {
      expect(serializedStorage).not.toContain(rawValue);
    }
  });

  test("requires URL-encoded body credentials and returns stable form errors", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    const client = await seedOAuthClient(db);
    const code = await issueAuthorizationCode(
      app,
      sessionCookie,
      client.id,
      "profile:read",
    );
    const validForm = {
      grant_type: "authorization_code",
      client_id: client.id,
      client_secret: client.secret,
      code,
      redirect_uri: REDIRECT_URI,
    };

    const jsonResponse = await app.request("/v2/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validForm),
    });
    await expectOAuthError(jsonResponse, 400, "invalid_request");

    const multipartBody = new FormData();
    for (const [name, value] of Object.entries(validForm)) {
      multipartBody.set(name, value);
    }
    const multipartResponse = await app.request("/v2/oauth/token", {
      method: "POST",
      body: multipartBody,
    });
    await expectOAuthError(multipartResponse, 400, "invalid_request");

    const basicResponse = await tokenRequest(app, validForm, {
      Authorization: `Basic ${Buffer.from(
        `${client.id}:${client.secret}`,
      ).toString("base64")}`,
    });
    const basicText = await basicResponse.text();
    const basicError = OAuthErrorResponseSchema.parse(JSON.parse(basicText));
    expect(basicResponse.status).toBe(401);
    expect(basicError.error).toBe("invalid_client");
    expect(basicText).not.toContain(client.secret);
    expect(basicText).not.toContain(code);

    const unsupportedResponse = await tokenRequest(app, {
      grant_type: "client_credentials",
    });
    await expectOAuthError(unsupportedResponse, 400, "unsupported_grant_type");

    const scopeResponse = await tokenRequest(app, {
      ...validForm,
      scope: "profile:read",
    });
    await expectOAuthError(scopeResponse, 400, "invalid_scope");

    const duplicateForm = new URLSearchParams(validForm);
    duplicateForm.append("code", "ab_code_duplicate");
    const duplicateResponse = await app.request("/v2/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: duplicateForm.toString(),
    });
    await expectOAuthError(duplicateResponse, 400, "invalid_request");

    expect(
      (
        await db
          .selectFrom("oauth_authorization_code")
          .select("used_at")
          .where("code_hash", "=", sha256(code))
          .executeTakeFirstOrThrow()
      ).used_at,
    ).toBeNull();
  });

  test("authenticates active clients without exposing credentials", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    const client = await seedOAuthClient(db);
    const code = await issueAuthorizationCode(
      app,
      sessionCookie,
      client.id,
      "profile:read",
    );

    const wrongSecret = "ab_cs_wrong-secret-value";
    const wrongSecretResponse = await tokenRequest(app, {
      grant_type: "authorization_code",
      client_id: client.id,
      client_secret: wrongSecret,
      code,
      redirect_uri: REDIRECT_URI,
    });
    const wrongSecretText = await wrongSecretResponse.text();
    expect(wrongSecretResponse.status).toBe(401);
    expect(OAuthErrorResponseSchema.parse(JSON.parse(wrongSecretText))).toEqual(
      {
        error: "invalid_client",
        error_description: "Client authentication failed",
      },
    );
    expect(wrongSecretText).not.toContain(wrongSecret);
    expect(wrongSecretText).not.toContain(code);

    const unknownResponse = await tokenRequest(app, {
      grant_type: "authorization_code",
      client_id: randomUUID(),
      client_secret: client.secret,
      code,
      redirect_uri: REDIRECT_URI,
    });
    await expectOAuthError(unknownResponse, 401, "invalid_client");

    await db
      .updateTable("oauth_client")
      .set({ disabled_at: new Date() })
      .where("id", "=", client.id)
      .execute();
    const disabledResponse = await tokenRequest(app, {
      grant_type: "authorization_code",
      client_id: client.id,
      client_secret: client.secret,
      code,
      redirect_uri: REDIRECT_URI,
    });
    await expectOAuthError(disabledResponse, 400, "unauthorized_client");
  });

  test("enforces code expiry, client binding, redirect binding, and single use", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    const firstClient = await seedOAuthClient(db);
    const secondClient = await seedOAuthClient(db);
    const code = await issueAuthorizationCode(
      app,
      sessionCookie,
      firstClient.id,
      "profile:read decks:write",
    );

    const otherClientResponse = await exchangeCode(
      app,
      secondClient,
      code,
      REDIRECT_URI,
    );
    await expectOAuthError(otherClientResponse, 400, "invalid_grant");

    const wrongRedirectResponse = await exchangeCode(
      app,
      firstClient,
      code,
      `${REDIRECT_URI}/different`,
    );
    await expectOAuthError(wrongRedirectResponse, 400, "invalid_grant");

    const successResponse = await exchangeCode(
      app,
      firstClient,
      code,
      REDIRECT_URI,
    );
    expect(successResponse.status).toBe(200);

    const repeatedResponse = await exchangeCode(
      app,
      firstClient,
      code,
      REDIRECT_URI,
    );
    await expectOAuthError(repeatedResponse, 400, "invalid_grant");

    const expiredCode = await issueAuthorizationCode(
      app,
      sessionCookie,
      firstClient.id,
      "profile:read",
    );
    await db
      .updateTable("oauth_authorization_code")
      .set({ expires_at: new Date(Date.now() - 1) })
      .where("code_hash", "=", sha256(expiredCode))
      .execute();
    const expiredResponse = await exchangeCode(
      app,
      firstClient,
      expiredCode,
      REDIRECT_URI,
    );
    await expectOAuthError(expiredResponse, 400, "invalid_grant");

    const codes = await db
      .selectFrom("oauth_authorization_code")
      .select(["code_hash", "used_at"])
      .execute();
    expect(
      codes.find((row) => row.code_hash === sha256(code))?.used_at,
    ).not.toBeNull();
    expect(
      codes.find((row) => row.code_hash === sha256(expiredCode))?.used_at,
    ).toBeNull();
  });

  test("prevents concurrent double exchange", async ({ dependencies }) => {
    const { app, db, sessionCookie } = dependencies;
    const client = await seedOAuthClient(db);
    const code = await issueAuthorizationCode(
      app,
      sessionCookie,
      client.id,
      "profile:read",
    );

    const responses = await Promise.all([
      exchangeCode(app, client, code, REDIRECT_URI),
      exchangeCode(app, client, code, REDIRECT_URI),
    ]);

    expect(
      responses.map((response) => response.status).sort((a, b) => a - b),
    ).toEqual([200, 400]);
    expect(
      await db.selectFrom("oauth_refresh_token").select("id").execute(),
    ).toHaveLength(1);
    expect(
      await db.selectFrom("oauth_access_token").select("id").execute(),
    ).toHaveLength(1);
  });

  test("rotates refresh tokens with a one-minute retry grace period", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    const issuedAt = new Date("2026-07-22T13:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(issuedAt);
    const client = await seedOAuthClient(db);
    const code = await issueAuthorizationCode(
      app,
      sessionCookie,
      client.id,
      "decks:delete profile:read",
    );
    const codeResponse = await exchangeCode(app, client, code, REDIRECT_URI);
    const initialTokens = TokenResponseSchema.parse(await codeResponse.json());
    const originalRefreshExpiry = new Date(
      issuedAt.getTime() + OAUTH_REFRESH_TOKEN_LIFETIME_MS,
    );

    const refreshedAt = new Date(issuedAt.getTime() + 24 * 60 * 60 * 1000);
    vi.setSystemTime(refreshedAt);
    const refreshResponse = await refresh(
      app,
      client,
      initialTokens.refresh_token,
    );
    const refreshedTokens = TokenResponseSchema.parse(
      await refreshResponse.json(),
    );

    expect(refreshResponse.status).toBe(200);
    expectNoStoreHeaders(refreshResponse);
    expect(refreshedTokens.refresh_token).not.toBe(initialTokens.refresh_token);
    expect(refreshedTokens.access_token).not.toBe(initialTokens.access_token);
    expect(refreshedTokens.scope).toBe(
      "profile:read decks:read decks:write decks:delete",
    );

    const originalRefreshToken = await db
      .selectFrom("oauth_refresh_token")
      .selectAll()
      .where("token_hash", "=", sha256(initialTokens.refresh_token))
      .executeTakeFirstOrThrow();
    const replacementRefreshToken = await db
      .selectFrom("oauth_refresh_token")
      .selectAll()
      .where("token_hash", "=", sha256(refreshedTokens.refresh_token))
      .executeTakeFirstOrThrow();
    expect(originalRefreshToken).toMatchObject({
      expires_at: originalRefreshExpiry,
      last_used_at: refreshedAt,
      rotated_at: refreshedAt,
    });
    expect(replacementRefreshToken).toMatchObject({
      expires_at: new Date(
        refreshedAt.getTime() + OAUTH_REFRESH_TOKEN_LIFETIME_MS,
      ),
      rotated_at: null,
      scopes: originalRefreshToken.scopes,
    });

    const scopeResponse = await tokenRequest(app, {
      grant_type: "refresh_token",
      client_id: client.id,
      client_secret: client.secret,
      refresh_token: refreshedTokens.refresh_token,
      scope: "profile:read",
    });
    await expectOAuthError(scopeResponse, 400, "invalid_scope");

    const retriedAt = new Date(
      refreshedAt.getTime() + OAUTH_REFRESH_TOKEN_ROTATION_GRACE_MS / 2,
    );
    vi.setSystemTime(retriedAt);
    const retryResponse = await refresh(
      app,
      client,
      initialTokens.refresh_token,
    );
    const retryTokens = TokenResponseSchema.parse(await retryResponse.json());
    expect(retryResponse.status).toBe(200);
    expect(retryTokens.refresh_token).not.toBe(initialTokens.refresh_token);
    expect(retryTokens.refresh_token).not.toBe(refreshedTokens.refresh_token);
    expect(
      await db
        .selectFrom("oauth_refresh_token")
        .select(["last_used_at", "rotated_at"])
        .where("id", "=", originalRefreshToken.id)
        .executeTakeFirstOrThrow(),
    ).toEqual({ last_used_at: retriedAt, rotated_at: refreshedAt });

    const graceExpiredAt = new Date(
      refreshedAt.getTime() + OAUTH_REFRESH_TOKEN_ROTATION_GRACE_MS,
    );
    vi.setSystemTime(graceExpiredAt);
    const staleResponse = await refresh(
      app,
      client,
      initialTokens.refresh_token,
    );
    await expectOAuthError(staleResponse, 400, "invalid_grant");

    const descendantResponse = await refresh(
      app,
      client,
      refreshedTokens.refresh_token,
    );
    expect(descendantResponse.status).toBe(200);

    const storedRefreshTokens = await db
      .selectFrom("oauth_refresh_token")
      .selectAll()
      .execute();
    const storedAccessTokens = await db
      .selectFrom("oauth_access_token")
      .selectAll()
      .execute();
    expect(storedRefreshTokens).toHaveLength(4);
    expect(storedAccessTokens).toHaveLength(4);
    expect(storedAccessTokens.every((token) => token.revoked_at == null)).toBe(
      true,
    );
  });

  test("rejects unusable or cross-client refresh tokens", async ({
    dependencies,
  }) => {
    const { app, db } = dependencies;
    const firstClient = await seedOAuthClient(db);
    const secondClient = await seedOAuthClient(db);
    const account = await db
      .selectFrom("account")
      .select("id")
      .where("name", "=", TEST_ACCOUNT.name)
      .executeTakeFirstOrThrow();
    const grant = await db
      .insertInto("oauth_grant")
      .values({
        account_id: account.id,
        oauth_client_id: firstClient.id,
        scopes: ["profile:read"],
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    const rawRefreshToken = `ab_rt_${randomUUID()}`;
    const refreshToken = await db
      .insertInto("oauth_refresh_token")
      .values({
        expires_at: new Date(Date.now() + 60_000),
        oauth_grant_id: grant.id,
        scopes: ["profile:read"],
        token_hash: sha256(rawRefreshToken),
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const crossClientResponse = await refresh(
      app,
      secondClient,
      rawRefreshToken,
    );
    await expectOAuthError(crossClientResponse, 400, "invalid_grant");

    await db
      .updateTable("oauth_refresh_token")
      .set({ revoked_at: new Date() })
      .where("id", "=", refreshToken.id)
      .execute();
    const revokedResponse = await refresh(app, firstClient, rawRefreshToken);
    await expectOAuthError(revokedResponse, 400, "invalid_grant");

    await db
      .updateTable("oauth_refresh_token")
      .set({ expires_at: new Date(Date.now() - 1), revoked_at: null })
      .where("id", "=", refreshToken.id)
      .execute();
    const expiredResponse = await refresh(app, firstClient, rawRefreshToken);
    await expectOAuthError(expiredResponse, 400, "invalid_grant");

    await db.deleteFrom("account").where("id", "=", account.id).execute();
    const deletedAccountResponse = await refresh(
      app,
      firstClient,
      rawRefreshToken,
    );
    await expectOAuthError(deletedAccountResponse, 400, "invalid_grant");
  });
});

type App = ReturnType<typeof appFactory>;
type OAuthClientCredentials = { id: string; secret: string };

async function seedOAuthClient(db: Database) {
  const id = randomUUID();
  const secret = generateOAuthClientSecret();
  const secretHash = await hashOAuthClientSecret(secret);

  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("oauth_client")
      .values({
        id,
        name: "OAuth token test client",
        secret_hash: secretHash,
      })
      .execute();
    await tx
      .insertInto("oauth_client_redirect_uri")
      .values({ oauth_client_id: id, redirect_uri: REDIRECT_URI })
      .execute();
  });

  return { id, secret };
}

async function issueAuthorizationCode(
  app: App,
  sessionCookie: string,
  clientId: string,
  scope: string,
) {
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope,
    state: randomUUID(),
  });
  const authorizationResponse = await app.request(
    `/v2/oauth/authorize?${query.toString()}`,
  );
  const requestToken = requiredSearchParameter(
    responseLocation(authorizationResponse),
    "request",
  );
  const headers = { Cookie: sessionCookie };

  const claimResponse = await app.request(
    `/v2/account/oauth/authorization-requests/${requestToken}/claim`,
    { method: "POST", headers },
  );
  expect(claimResponse.status).toBe(200);
  const approvalResponse = await app.request(
    `/v2/account/oauth/authorization-requests/${requestToken}/approve`,
    { method: "POST", headers },
  );
  expect(approvalResponse.status).toBe(302);

  return requiredSearchParameter(responseLocation(approvalResponse), "code");
}

async function exchangeCode(
  app: App,
  client: OAuthClientCredentials,
  code: string,
  redirectUri: string,
) {
  return await tokenRequest(app, {
    grant_type: "authorization_code",
    client_id: client.id,
    client_secret: client.secret,
    code,
    redirect_uri: redirectUri,
  });
}

async function refresh(
  app: App,
  client: OAuthClientCredentials,
  refreshToken: string,
) {
  return await tokenRequest(app, {
    grant_type: "refresh_token",
    client_id: client.id,
    client_secret: client.secret,
    refresh_token: refreshToken,
  });
}

async function tokenRequest(
  app: App,
  fields: Record<string, string>,
  additionalHeaders: Record<string, string> = {},
) {
  return await app.request("/v2/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...additionalHeaders,
    },
    body: new URLSearchParams(fields).toString(),
  });
}

async function expectOAuthError(
  response: Response,
  status: number,
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

function responseLocation(response: Response) {
  const location = response.headers.get("Location");
  if (!location) throw new Error("OAuth redirect location is missing");
  return new URL(location);
}

function requiredSearchParameter(url: URL, name: string) {
  const value = url.searchParams.get(name);
  if (!value) throw new Error(`OAuth redirect is missing ${name}`);
  return value;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
