import { createHash, randomUUID } from "node:crypto";
import { OAuthConsentDetailsResponseSchema } from "@arkham-build/shared";
import { describe, expect, vi } from "vitest";
import type { appFactory } from "../app.ts";
import type { Database } from "../db/db.ts";
import { OAUTH_AUTHORIZATION_CODE_LIFETIME_MS } from "../features/oauth/lib/consent.ts";
import { createSession } from "../lib/auth/sessions.ts";
import type { Config } from "../lib/config.ts";
import { test } from "./test-utils.ts";

const REDIRECT_URI = "https://example.com/oauth/callback?existing=kept";

describe("OAuth account consent routes", () => {
  test("requires an authenticated session", async ({ dependencies }) => {
    const clientId = await seedOAuthClient(dependencies.db);
    const requestToken = await startAuthorization(dependencies.app, clientId);

    const response = await postConsentAction(
      dependencies.app,
      requestToken,
      "claim",
    );

    expect(response.status).toBe(401);
  });

  test("idempotently claims for one account and returns the consent DTO", async ({
    dependencies,
  }) => {
    const { app, config, db, sessionCookie } = dependencies;
    const now = new Date("2026-07-22T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const clientId = await seedOAuthClient(db, {
      name: "Consent test application",
    });
    const requestToken = await startAuthorization(app, clientId, {
      scope: "decks:delete profile:read",
    });

    const firstResponse = await postConsentAction(
      app,
      requestToken,
      "claim",
      sessionCookie,
    );
    const firstBody = OAuthConsentDetailsResponseSchema.parse(
      await firstResponse.json(),
    );
    const firstStoredRequest = await findAuthorizationRequest(db, requestToken);

    vi.setSystemTime(new Date(now.getTime() + 1_000));
    const secondResponse = await postConsentAction(
      app,
      requestToken,
      "claim",
      sessionCookie,
    );
    const secondBody = OAuthConsentDetailsResponseSchema.parse(
      await secondResponse.json(),
    );
    const secondStoredRequest = await findAuthorizationRequest(
      db,
      requestToken,
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstBody).toEqual({
      client: {
        id: clientId,
        name: "Consent test application",
      },
      scopes: ["profile:read", "decks:read", "decks:write", "decks:delete"],
      expiresAt: new Date(now.getTime() + 15 * 60 * 1_000).toISOString(),
    });
    expect(secondBody).toEqual(firstBody);
    expect(firstStoredRequest.account_id).not.toBeNull();
    expect(firstStoredRequest.claimed_at).toEqual(now);
    expect(secondStoredRequest.claimed_at).toEqual(now);

    const otherAccount = await createAccountSession(db, config, {
      name: "other-consent-account",
    });
    const crossAccountResponse = await postConsentAction(
      app,
      requestToken,
      "claim",
      otherAccount.cookie,
    );

    expect(crossAccountResponse.status).toBe(403);
    expect(await crossAccountResponse.json()).toMatchObject({
      message: "Authorization request belongs to another account",
    });
    expect((await findAuthorizationRequest(db, requestToken)).account_id).toBe(
      firstStoredRequest.account_id,
    );
  });

  test("requires a claim and explicit approval before issuing a code", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    const clientId = await seedOAuthClient(db);
    const approveToken = await startAuthorization(app, clientId, {
      state: "approve-unclaimed",
    });
    const denyToken = await startAuthorization(app, clientId, {
      state: "deny-unclaimed",
    });

    expect(
      await db.selectFrom("oauth_authorization_code").select("id").execute(),
    ).toEqual([]);

    for (const [token, action] of [
      [approveToken, "approve"],
      [denyToken, "deny"],
    ] as const) {
      const response = await postConsentAction(
        app,
        token,
        action,
        sessionCookie,
      );

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        message: "Authorization request must be claimed before a decision",
      });
      expect(
        (await findAuthorizationRequest(db, token)).consumed_at,
      ).toBeNull();
    }

    expect(
      await db.selectFrom("oauth_authorization_code").select("id").execute(),
    ).toEqual([]);
  });

  test("approves with a hashed five-minute code and accumulates grant scopes", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    const firstNow = new Date("2026-07-22T11:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(firstNow);
    const clientId = await seedOAuthClient(db);
    const firstToken = await startAuthorization(app, clientId, {
      scope: "profile:read decks:write",
      state: "first-approval-state",
    });

    await postConsentAction(app, firstToken, "claim", sessionCookie);
    const firstApproval = await postConsentAction(
      app,
      firstToken,
      "approve",
      sessionCookie,
    );
    const firstCallback = responseLocation(firstApproval);
    const firstCode = requiredSearchParameter(firstCallback, "code");

    expect(firstApproval.status).toBe(302);
    expect(firstCallback.searchParams.get("existing")).toBe("kept");
    expect(firstCallback.searchParams.get("state")).toBe(
      "first-approval-state",
    );
    expect(firstCallback.searchParams.get("error")).toBeNull();
    expect(firstCode).toMatch(/^ab_code_[A-Za-z0-9_-]{43}$/);

    const firstStoredRequest = await findAuthorizationRequest(db, firstToken);
    const firstGrant = await db
      .selectFrom("oauth_grant")
      .selectAll()
      .where("oauth_client_id", "=", clientId)
      .executeTakeFirstOrThrow();
    const firstStoredCode = await db
      .selectFrom("oauth_authorization_code")
      .selectAll()
      .where("code_hash", "=", sha256(firstCode))
      .executeTakeFirstOrThrow();

    expect(firstStoredRequest).toMatchObject({
      consumed_at: firstNow,
      decision: "approved",
    });
    expect(firstGrant.scopes).toEqual([
      "profile:read",
      "decks:read",
      "decks:write",
    ]);
    expect(firstStoredCode).toMatchObject({
      code_hash: sha256(firstCode),
      expires_at: new Date(
        firstNow.getTime() + OAUTH_AUTHORIZATION_CODE_LIFETIME_MS,
      ),
      oauth_grant_id: firstGrant.id,
      redirect_uri: REDIRECT_URI,
      scopes: ["profile:read", "decks:read", "decks:write"],
    });
    expect(JSON.stringify(firstStoredCode)).not.toContain(firstCode);

    const secondNow = new Date(firstNow.getTime() + 60_000);
    vi.setSystemTime(secondNow);
    const secondToken = await startAuthorization(app, clientId, {
      scope: "profile:read",
      state: "second-approval-state",
    });
    await postConsentAction(app, secondToken, "claim", sessionCookie);

    expect(
      await db
        .selectFrom("oauth_authorization_code")
        .select("id")
        .where("oauth_grant_id", "=", firstGrant.id)
        .execute(),
    ).toHaveLength(1);

    const secondApproval = await postConsentAction(
      app,
      secondToken,
      "approve",
      sessionCookie,
    );
    const secondCode = requiredSearchParameter(
      responseLocation(secondApproval),
      "code",
    );
    const updatedGrant = await db
      .selectFrom("oauth_grant")
      .selectAll()
      .where("id", "=", firstGrant.id)
      .executeTakeFirstOrThrow();
    const secondStoredCode = await db
      .selectFrom("oauth_authorization_code")
      .selectAll()
      .where("code_hash", "=", sha256(secondCode))
      .executeTakeFirstOrThrow();

    expect(secondApproval.status).toBe(302);
    expect(updatedGrant.scopes).toEqual([
      "profile:read",
      "decks:read",
      "decks:write",
    ]);
    expect(updatedGrant.created_at).toEqual(firstGrant.created_at);
    expect(updatedGrant.updated_at).toEqual(secondNow);
    expect(secondStoredCode.scopes).toEqual(["profile:read"]);
    expect(secondStoredCode.expires_at).toEqual(
      new Date(secondNow.getTime() + OAUTH_AUTHORIZATION_CODE_LIFETIME_MS),
    );
  });

  test("denies and redirects with access_denied", async ({ dependencies }) => {
    const { app, db, sessionCookie } = dependencies;
    const clientId = await seedOAuthClient(db);
    const requestToken = await startAuthorization(app, clientId, {
      state: "denial-state",
    });
    await postConsentAction(app, requestToken, "claim", sessionCookie);

    const response = await postConsentAction(
      app,
      requestToken,
      "deny",
      sessionCookie,
    );
    const callback = responseLocation(response);

    expect(response.status).toBe(302);
    expect(callback.searchParams.get("existing")).toBe("kept");
    expect(callback.searchParams.get("error")).toBe("access_denied");
    expect(callback.searchParams.get("state")).toBe("denial-state");
    expect(callback.searchParams.get("code")).toBeNull();
    expect(await findAuthorizationRequest(db, requestToken)).toMatchObject({
      consumed_at: expect.any(Date),
      decision: "denied",
    });
    expect(await db.selectFrom("oauth_grant").select("id").execute()).toEqual(
      [],
    );
    expect(
      await db.selectFrom("oauth_authorization_code").select("id").execute(),
    ).toEqual([]);

    const repeatedResponse = await postConsentAction(
      app,
      requestToken,
      "approve",
      sessionCookie,
    );
    expect(repeatedResponse.status).toBe(400);
    expect(
      await db.selectFrom("oauth_authorization_code").select("id").execute(),
    ).toEqual([]);
  });

  test("rechecks request, client, and exact redirect status", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    const expired = await seedRequestScenario(app, db, "expired");
    await db
      .updateTable("oauth_authorization_request")
      .set({ expires_at: new Date(Date.now() - 1) })
      .where("request_token_hash", "=", sha256(expired.requestToken))
      .execute();

    const consumed = await seedRequestScenario(app, db, "consumed");
    await db
      .updateTable("oauth_authorization_request")
      .set({ consumed_at: new Date() })
      .where("request_token_hash", "=", sha256(consumed.requestToken))
      .execute();

    const disabled = await seedRequestScenario(app, db, "disabled");
    await db
      .updateTable("oauth_client")
      .set({ disabled_at: new Date() })
      .where("id", "=", disabled.clientId)
      .execute();

    const removedRedirect = await seedRequestScenario(
      app,
      db,
      "removed-redirect",
    );
    await db
      .deleteFrom("oauth_client_redirect_uri")
      .where("oauth_client_id", "=", removedRedirect.clientId)
      .where("redirect_uri", "=", REDIRECT_URI)
      .execute();

    for (const scenario of [expired, consumed, disabled, removedRedirect]) {
      const response = await postConsentAction(
        app,
        scenario.requestToken,
        "claim",
        sessionCookie,
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: "Authorization request is invalid or expired",
      });
    }
  });

  test("rechecks account existence, ban status, and profile completion", async ({
    dependencies,
  }) => {
    const { app, config, db } = dependencies;
    const clientId = await seedOAuthClient(db);

    const incomplete = await createAccountSession(db, config, {
      name: "incomplete-consent-account",
      profileCompletedAt: null,
    });
    const incompleteToken = await startAuthorization(app, clientId, {
      state: "incomplete-account",
    });
    const incompleteResponse = await postConsentAction(
      app,
      incompleteToken,
      "claim",
      incomplete.cookie,
    );
    expect(incompleteResponse.status).toBe(403);
    expect(await incompleteResponse.json()).toMatchObject({
      message: "Profile completion required",
    });

    const banned = await createAccountSession(db, config, {
      name: "banned-consent-account",
    });
    await db
      .insertInto("account_moderation_action")
      .values({
        account_id: banned.accountId,
        reason: "OAuth consent test ban",
        scope: "account",
        type: "ban",
      })
      .execute();
    const bannedToken = await startAuthorization(app, clientId, {
      state: "banned-account",
    });
    const bannedResponse = await postConsentAction(
      app,
      bannedToken,
      "claim",
      banned.cookie,
    );
    expect(bannedResponse.status).toBe(403);
    expect(await bannedResponse.json()).toMatchObject({
      message: "Account is banned",
    });

    const deleted = await createAccountSession(db, config, {
      name: "deleted-consent-account",
    });
    const deletedToken = await startAuthorization(app, clientId, {
      state: "deleted-account",
    });
    await db
      .deleteFrom("account")
      .where("id", "=", deleted.accountId)
      .execute();
    const deletedResponse = await postConsentAction(
      app,
      deletedToken,
      "claim",
      deleted.cookie,
    );
    expect(deletedResponse.status).toBe(401);
  });

  test("allows only one concurrent approval or denial decision", async ({
    dependencies,
  }) => {
    const { app, db, sessionCookie } = dependencies;
    const clientId = await seedOAuthClient(db);
    const requestToken = await startAuthorization(app, clientId, {
      state: "concurrent-decision",
    });
    await postConsentAction(app, requestToken, "claim", sessionCookie);

    const responses = await Promise.all([
      postConsentAction(app, requestToken, "approve", sessionCookie),
      postConsentAction(app, requestToken, "deny", sessionCookie),
    ]);
    const request = await findAuthorizationRequest(db, requestToken);
    const codes = await db
      .selectFrom("oauth_authorization_code")
      .select("id")
      .execute();

    expect(
      responses.map((response) => response.status).sort((a, b) => a - b),
    ).toEqual([302, 400]);
    expect(request.consumed_at).toEqual(expect.any(Date));
    expect(["approved", "denied"]).toContain(request.decision);
    expect(codes).toHaveLength(request.decision === "approved" ? 1 : 0);
  });
});

type App = ReturnType<typeof appFactory>;
type ConsentAction = "approve" | "claim" | "deny";

async function seedOAuthClient(
  db: Database,
  options: { name?: string; redirectUri?: string } = {},
) {
  const clientId = randomUUID();
  const redirectUri = options.redirectUri ?? REDIRECT_URI;
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("oauth_client")
      .values({
        id: clientId,
        name: options.name ?? "OAuth consent test client",
        secret_hash: "test-secret-hash",
      })
      .execute();
    await tx
      .insertInto("oauth_client_redirect_uri")
      .values({ oauth_client_id: clientId, redirect_uri: redirectUri })
      .execute();
  });
  return clientId;
}

async function startAuthorization(
  app: App,
  clientId: string,
  options: {
    redirectUri?: string;
    scope?: string;
    state?: string;
  } = {},
) {
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: options.redirectUri ?? REDIRECT_URI,
    response_type: "code",
    scope: options.scope ?? "profile:read",
    state: options.state ?? `state-${randomUUID()}`,
  });
  const response = await app.request(`/v2/oauth/authorize?${query.toString()}`);

  expect(response.status).toBe(302);
  return requiredSearchParameter(responseLocation(response), "request");
}

async function postConsentAction(
  app: App,
  requestToken: string,
  action: ConsentAction,
  cookie?: string,
) {
  const headers = new Headers();
  if (cookie) headers.set("Cookie", cookie);

  return await app.request(
    `/v2/account/oauth/authorization-requests/${requestToken}/${action}`,
    { method: "POST", headers },
  );
}

async function findAuthorizationRequest(db: Database, requestToken: string) {
  return await db
    .selectFrom("oauth_authorization_request")
    .selectAll()
    .where("request_token_hash", "=", sha256(requestToken))
    .executeTakeFirstOrThrow();
}

async function seedRequestScenario(app: App, db: Database, name: string) {
  const clientId = await seedOAuthClient(db, {
    name: `OAuth ${name} test client`,
  });
  const requestToken = await startAuthorization(app, clientId, {
    state: `${name}-state`,
  });
  return { clientId, requestToken };
}

async function createAccountSession(
  db: Database,
  config: Config,
  input: { name: string; profileCompletedAt?: Date | null },
) {
  const account = await db
    .insertInto("account")
    .values({
      name: input.name,
      profile_completed_at: input.profileCompletedAt,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  const session = await createSession(
    db,
    account.id,
    config.SESSION_EXPIRY_HOURS,
  );

  return {
    accountId: account.id,
    cookie: `${config.SESSION_COOKIE_NAME}=${session.token}`,
  };
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
