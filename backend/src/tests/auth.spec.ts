/** biome-ignore-all lint/suspicious/noExplicitAny: test code */
import assert from "node:assert";
import type { Hono } from "hono";
import { describe, expect, vi } from "vitest";
import type { EmailService } from "../lib/email/email-service.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import type { MockMailer } from "./mocks/email.ts";
import { test } from "./test-utils.ts";

interface SignupParams {
  name: string;
  email: string;
  password: string;
}

function signup(app: Hono<HonoEnv>, params: SignupParams) {
  return app.request("/v2/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

function verifyEmail(app: Hono<HonoEnv>, token: string) {
  return app.request("/v2/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

function login(app: Hono<HonoEnv>, email: string, password: string) {
  return app.request("/v2/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

function forgotPassword(app: Hono<HonoEnv>, emailOrUsername: string) {
  return app.request("/v2/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailOrUsername }),
  });
}

function resetPassword(app: Hono<HonoEnv>, token: string, password: string) {
  return app.request("/v2/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
}

function resendVerification(app: Hono<HonoEnv>, email: string) {
  return app.request("/v2/auth/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

async function startOAuthFlow(
  app: Hono<HonoEnv>,
  path: string,
  cookie?: string,
) {
  const init: RequestInit = {
    method: "GET",
  };

  if (cookie) {
    init.headers = { Cookie: cookie };
  }

  const res = await app.request(path, init);

  const location = res.headers.get("location");
  assert(location, "Missing location header");

  const state = new URL(location).searchParams.get("state");
  assert(state, "Missing OAuth state");

  const setCookie = res.headers.get("set-cookie");
  assert(setCookie, "Missing set-cookie header");

  const [oauthCookie] = setCookie.split(";", 1);
  assert(oauthCookie, "Missing OAuth cookie");

  return {
    cookie: oauthCookie,
    state,
  };
}

function mockArkhamDbOAuthResponse(decksResponse: unknown) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "access-token",
            expires_in: 3600,
            refresh_token: "refresh-token",
            scope: null,
            token_type: "Bearer",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(decksResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
  );
}

function mockArkhamDbOAuth(userId: number) {
  mockArkhamDbOAuthResponse([{ user_id: userId }]);
}

async function signupAndVerify(
  app: Hono<HonoEnv>,
  emailService: EmailService<MockMailer>,
  params: SignupParams,
) {
  await signup(app, params);
  const token = extractToken(
    emailService.mailer.sentEmails[emailService.mailer.sentEmails.length - 1]
      ?.body,
  );
  if (!token) throw new Error("No verification token found");
  await verifyEmail(app, token);
  return token;
}

function extractToken(
  emailBody: string | undefined,
): string | null | undefined {
  const match = emailBody?.match(/token=([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

describe("Auth routes", () => {
  describe("GET /auth/arkhamdb/login", () => {
    test("redirects to arkhamdb oauth", async ({ dependencies }) => {
      const { app, config } = dependencies;

      const res = await app.request("/auth/arkhamdb/login", {
        method: "GET",
      });

      expect(res.status).toBe(302);

      const location = res.headers.get("location");
      assert(location, "Missing location header");

      const url = new URL(location);

      expect(url.origin + url.pathname).toBe(
        `${config.ARKHAMDB_BASE_URL}/oauth/v2/auth`,
      );
      expect(url.searchParams.get("client_id")).toBe(
        config.ARKHAMDB_OAUTH_CLIENT_ID,
      );
      expect(url.searchParams.get("redirect_uri")).toBe(
        config.ARKHAMDB_OAUTH_REDIRECT_URI,
      );
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("state")).toBeTruthy();
    });
  });

  describe("GET /auth/arkhamdb/signup", () => {
    test("redirects to arkhamdb oauth", async ({ dependencies }) => {
      const { app, config } = dependencies;

      const res = await app.request("/auth/arkhamdb/signup", {
        method: "GET",
      });

      expect(res.status).toBe(302);

      const location = res.headers.get("location");
      assert(location, "Missing location header");

      const url = new URL(location);

      expect(url.origin + url.pathname).toBe(
        `${config.ARKHAMDB_BASE_URL}/oauth/v2/auth`,
      );
      expect(url.searchParams.get("client_id")).toBe(
        config.ARKHAMDB_OAUTH_CLIENT_ID,
      );
      expect(url.searchParams.get("redirect_uri")).toBe(
        config.ARKHAMDB_OAUTH_REDIRECT_URI,
      );
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("state")).toBeTruthy();
    });
  });

  describe("GET /auth/arkhamdb/connect", () => {
    test("requires authentication", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await app.request("/auth/arkhamdb/connect", {
        method: "GET",
      });

      expect(res.status).toBe(401);
    });

    test("redirects authenticated users to arkhamdb oauth", async ({
      dependencies,
    }) => {
      const { app, config, sessionCookie } = dependencies;

      const res = await app.request("/auth/arkhamdb/connect", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(302);

      const location = res.headers.get("location");
      assert(location, "Missing location header");

      const url = new URL(location);

      expect(url.origin + url.pathname).toBe(
        `${config.ARKHAMDB_BASE_URL}/oauth/v2/auth`,
      );
      expect(url.searchParams.get("client_id")).toBe(
        config.ARKHAMDB_OAUTH_CLIENT_ID,
      );
      expect(url.searchParams.get("redirect_uri")).toBe(
        config.ARKHAMDB_OAUTH_REDIRECT_URI,
      );
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("state")).toBeTruthy();
    });
  });

  describe("DELETE /v2/auth/oauth/:provider", () => {
    test("requires authentication", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await app.request("/v2/auth/oauth/arkhamdb", {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
    });

    test("disconnects an OAuth identity when another login identity exists", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;

      const account = await db
        .selectFrom("account")
        .select(["id"])
        .where("name", "=", "test-account")
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "12345",
          verified_at: new Date(),
        })
        .executeTakeFirstOrThrow();

      const res = await app.request("/v2/auth/oauth/arkhamdb", {
        method: "DELETE",
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);

      const identity = await db
        .selectFrom("account_identity")
        .select(["id"])
        .where("account_id", "=", account.id)
        .where("provider", "=", "arkhamdb")
        .executeTakeFirst();

      expect(identity).toBeUndefined();
    });

    test("rejects disconnecting the last usable login identity", async ({
      dependencies,
    }) => {
      const { app, config, db } = dependencies;

      const account = await db
        .insertInto("account")
        .values({ name: "oauth-only-account" })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "oauth-only-user",
          verified_at: new Date(),
        })
        .executeTakeFirstOrThrow();

      const session = await db
        .insertInto("session")
        .values({
          account_id: account.id,
          expires_at: new Date(Date.now() + 60 * 60 * 1000),
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      const res = await app.request("/v2/auth/oauth/arkhamdb", {
        method: "DELETE",
        headers: { Cookie: `${config.SESSION_COOKIE_NAME}=${session.id}` },
      });

      expect(res.status).toBe(400);
      expect(await res.text()).toContain(
        "Account must have at least one login identity",
      );
    });
  });

  describe("GET /auth/arkhamdb/callback", () => {
    test("completes oauth signup for a new account", async ({
      dependencies,
    }) => {
      const { app, config, db } = dependencies;

      const oauth = await startOAuthFlow(app, "/auth/arkhamdb/signup");
      mockArkhamDbOAuth(12345);

      try {
        const res = await app.request(
          `/auth/arkhamdb/callback?code=test-code&state=${oauth.state}`,
          {
            method: "GET",
            headers: { Cookie: oauth.cookie },
          },
        );

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe(
          `${config.FRONTEND_URL}/auth/signup/complete`,
        );
        expect(res.headers.get("set-cookie")).toContain(
          `${config.SESSION_COOKIE_NAME}=`,
        );

        const identity = await db
          .selectFrom("account_identity")
          .select(["provider", "provider_user_id"])
          .where("provider", "=", "arkhamdb")
          .where("provider_user_id", "=", "12345")
          .executeTakeFirst();

        expect(identity).toMatchObject({
          provider: "arkhamdb",
          provider_user_id: "12345",
        });
      } finally {
        vi.unstubAllGlobals();
      }
    });

    test("logs in an existing oauth account", async ({ dependencies }) => {
      const { app, config, db } = dependencies;

      const account = await db
        .selectFrom("account")
        .select(["id"])
        .where("name", "=", "test-account")
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "12345",
          verified_at: new Date(),
        })
        .executeTakeFirstOrThrow();

      const oauth = await startOAuthFlow(app, "/auth/arkhamdb/login");
      mockArkhamDbOAuth(12345);

      try {
        const res = await app.request(
          `/auth/arkhamdb/callback?code=test-code&state=${oauth.state}`,
          {
            method: "GET",
            headers: { Cookie: oauth.cookie },
          },
        );

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe(`${config.FRONTEND_URL}/`);
        expect(res.headers.get("set-cookie")).toContain(
          `${config.SESSION_COOKIE_NAME}=`,
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });

    test("connects an OAuth identity for the authenticated account", async ({
      dependencies,
    }) => {
      const { app, config, db, sessionCookie } = dependencies;

      const account = await db
        .selectFrom("account")
        .select(["id"])
        .where("name", "=", "test-account")
        .executeTakeFirstOrThrow();

      const oauth = await startOAuthFlow(
        app,
        "/auth/arkhamdb/connect",
        sessionCookie,
      );
      mockArkhamDbOAuth(12345);

      try {
        const res = await app.request(
          `/auth/arkhamdb/callback?code=test-code&state=${oauth.state}`,
          {
            method: "GET",
            headers: { Cookie: oauth.cookie },
          },
        );

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe(
          `${config.FRONTEND_URL}/settings?tab=account`,
        );

        const identity = await db
          .selectFrom("account_identity")
          .select(["account_id", "provider", "provider_user_id"])
          .where("provider", "=", "arkhamdb")
          .where("provider_user_id", "=", "12345")
          .executeTakeFirst();

        expect(identity).toMatchObject({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "12345",
        });
      } finally {
        vi.unstubAllGlobals();
      }
    });

    test("redirects signup failures back to signup with oauth_error", async ({
      dependencies,
    }) => {
      const { app, config } = dependencies;

      const oauth = await startOAuthFlow(app, "/auth/arkhamdb/signup");
      mockArkhamDbOAuthResponse([]);

      try {
        const res = await app.request(
          `/auth/arkhamdb/callback?code=test-code&state=${oauth.state}`,
          {
            method: "GET",
            headers: { Cookie: oauth.cookie },
          },
        );

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe(
          `${config.FRONTEND_URL}/auth/signup?oauth_error=arkhamdb_no_decks`,
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });

    test("redirects missing signup code back to signup with oauth_error", async ({
      dependencies,
    }) => {
      const { app, config } = dependencies;

      const oauth = await startOAuthFlow(app, "/auth/arkhamdb/signup");

      const res = await app.request(
        `/auth/arkhamdb/callback?state=${oauth.state}`,
        {
          method: "GET",
          headers: { Cookie: oauth.cookie },
        },
      );

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(
        `${config.FRONTEND_URL}/auth/signup?oauth_error=oauth_missing_code`,
      );
    });

    test("redirects invalid login state back to login with oauth_error", async ({
      dependencies,
    }) => {
      const { app, config } = dependencies;

      const oauth = await startOAuthFlow(app, "/auth/arkhamdb/login");
      mockArkhamDbOAuth(12345);

      try {
        const res = await app.request(
          "/auth/arkhamdb/callback?code=test-code&state=wrong-state",
          {
            method: "GET",
            headers: { Cookie: oauth.cookie },
          },
        );

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe(
          `${config.FRONTEND_URL}/auth/login?oauth_error=invalid_state`,
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });

    test("redirects connect conflicts back to account settings with oauth_error", async ({
      dependencies,
    }) => {
      const { app, config, db, sessionCookie } = dependencies;

      const otherAccount = await db
        .insertInto("account")
        .values({ name: "other-account" })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: otherAccount.id,
          provider: "arkhamdb",
          provider_user_id: "12345",
          verified_at: new Date(),
        })
        .executeTakeFirstOrThrow();

      const oauth = await startOAuthFlow(
        app,
        "/auth/arkhamdb/connect",
        sessionCookie,
      );
      mockArkhamDbOAuth(12345);

      try {
        const res = await app.request(
          `/auth/arkhamdb/callback?code=test-code&state=${oauth.state}`,
          {
            method: "GET",
            headers: { Cookie: oauth.cookie },
          },
        );

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe(
          `${config.FRONTEND_URL}/settings?tab=account&oauth_error=identity_belongs_to_another_account`,
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe("POST /v2/auth/signup", () => {
    test("creates a new account and sends verification email", async ({
      dependencies,
    }) => {
      const { app, emailService } = dependencies;

      const res = await signup(app, {
        name: "testuser",
        email: "test@example.com",
        password: "SecurePassword123!",
      });

      expect(res.status).toBe(201);
      expect(emailService.mailer.sentEmails).toHaveLength(1);
      expect(
        extractToken(emailService.mailer.sentEmails[0]?.body),
      ).toBeTruthy();
      expect(emailService.mailer.sentEmails[0]?.to).toEqual("test@example.com");
    });

    test("validates account does not exist", async ({ dependencies }) => {
      const { app } = dependencies;

      await signup(app, {
        name: "testuser",
        email: "duplicate@example.com",
        password: "SecurePassword123!",
      });

      const res = await signup(app, {
        name: "anotheruser",
        email: "duplicate@example.com",
        password: "AnotherPassword123!",
      });

      expect(res.status).toBe(400);
    });

    test("returns a clear error for duplicate usernames", async ({
      dependencies,
    }) => {
      const { app } = dependencies;

      await signup(app, {
        name: "duplicate-user",
        email: "first@example.com",
        password: "SecurePassword123!",
      });

      const res = await signup(app, {
        name: "duplicate-user",
        email: "second@example.com",
        password: "AnotherPassword123!",
      });

      expect(res.status).toBe(400);
      expect(await res.text()).toContain("Username is already taken");
    });

    test("validates required fields", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await app.request("/v2/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "testuser",
        }),
      });

      expect(res.status).toBe(400);
    });

    test("does not allow special characters in username", async ({
      dependencies,
    }) => {
      const { app } = dependencies;

      const res = await app.request("/v2/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test@user",
          email: "test@example.com",
          password: "SecurePassword123!",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /v2/auth/verify-email", () => {
    test("verifies email with valid token", async ({ dependencies }) => {
      const { app, emailService } = dependencies;

      await signup(app, {
        name: "testuser",
        email: "verify@example.com",
        password: "SecurePassword123!",
      });

      const token = extractToken(emailService.mailer.sentEmails[0]?.body);
      assert(token, "No verification token found");

      const res = await verifyEmail(app, token);
      expect(res.status).toBe(200);
    });

    test("does not verify invalid token", async ({ dependencies }) => {
      const { app } = dependencies;
      const res = await verifyEmail(app, "invalid-token");
      expect(res.status).toBe(400);
    });

    test("token can only be used once", async ({ dependencies }) => {
      const { app, emailService } = dependencies;

      await signup(app, {
        name: "testuser",
        email: "once@example.com",
        password: "SecurePassword123!",
      });

      const token = extractToken(emailService.mailer.sentEmails[0]?.body);
      assert(token, "No verification token found");

      const res1 = await verifyEmail(app, token);
      expect(res1.status).toBe(200);

      const res2 = await verifyEmail(app, token);
      expect(res2.status).toBe(400);
    });
  });

  describe("POST /v2/auth/login", () => {
    test("logs in with valid credentials after verification", async ({
      dependencies,
    }) => {
      const { app, emailService } = dependencies;

      await signupAndVerify(app, emailService, {
        name: "testuser",
        email: "login@example.com",
        password: "SecurePassword123!",
      });

      const res = await login(app, "login@example.com", "SecurePassword123!");

      expect(res.status).toBe(200);
      const cookies = res.headers.get("set-cookie");
      expect(cookies).toContain("arkham-build-session");
    });

    test("does not log in with invalid password", async ({ dependencies }) => {
      const { app, emailService } = dependencies;

      await signupAndVerify(app, emailService, {
        name: "testuser",
        email: "wrong-pass@example.com",
        password: "SecurePassword123!",
      });

      const res = await login(app, "wrong-pass@example.com", "WrongPassword!");
      expect(res.status).toBe(401);
    });

    test("does not log in with missing user", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await login(
        app,
        "nonexistent@example.com",
        "SomePassword123!",
      );

      expect(res.status).toBe(401);
    });

    test("does not log in unverified users", async ({ dependencies }) => {
      const { app } = dependencies;

      await signup(app, {
        name: "testuser",
        email: "unverified@example.com",
        password: "SecurePassword123!",
      });

      const res = await login(
        app,
        "unverified@example.com",
        "SecurePassword123!",
      );

      expect(res.status).toBe(403);
    });
  });

  describe("GET /v2/auth/me", () => {
    test("returns user information for authenticated user", async ({
      dependencies,
    }) => {
      const { app, emailService } = dependencies;

      await signupAndVerify(app, emailService, {
        name: "testuser",
        email: "me@example.com",
        password: "SecurePassword123!",
      });

      const loginRes = await login(app, "me@example.com", "SecurePassword123!");
      const cookies = loginRes.headers.get("set-cookie");

      const res = await app.request("/v2/auth/me", {
        method: "GET",
        headers: { Cookie: cookies || "" },
      });

      expect(res.status).toBe(200);

      expect(await res.json()).toMatchObject({
        account: {
          name: "testuser",
        },
        identities: [
          {
            provider: "email",
            email: "me@example.com",
            pendingEmail: null,
            verified: true,
          },
        ],
      });
    });

    test("includes oauth connections for authenticated user", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;

      const account = await db
        .selectFrom("account")
        .select(["id"])
        .where("name", "=", "test-account")
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "12345",
          verified_at: new Date(),
        })
        .executeTakeFirstOrThrow();

      const res = await app.request("/v2/auth/me", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        identities: [
          {
            provider: "arkhamdb",
            providerUserId: "12345",
            details: {
              status: "healthy",
              createdAt: expect.any(String),
              lastSyncedAt: null,
              username: null,
            },
          },
          {
            provider: "email",
            email: "test-account@example.com",
            pendingEmail: null,
            verified: true,
          },
        ],
      });
    });

    test("returns 401 when not authenticated", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await app.request("/v2/auth/me", {
        method: "GET",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /v2/auth/logout", () => {
    test("logs out authenticated user", async ({ dependencies }) => {
      const { app, emailService } = dependencies;

      await signupAndVerify(app, emailService, {
        name: "testuser",
        email: "logout@example.com",
        password: "SecurePassword123!",
      });

      const loginRes = await login(
        app,
        "logout@example.com",
        "SecurePassword123!",
      );
      const cookies = loginRes.headers.get("set-cookie");

      const res = await app.request("/v2/auth/logout", {
        method: "POST",
        headers: { Cookie: cookies || "" },
      });

      expect(res.status).toBe(200);

      const meRes = await app.request("/v2/auth/me", {
        method: "GET",
        headers: { Cookie: cookies || "" },
      });

      expect(meRes.status).toBe(401);
    });

    test("returns 401 when not authenticated", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await app.request("/v2/auth/logout", {
        method: "POST",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /v2/auth/resend-verification", () => {
    test("resends verification email for unverified account", async ({
      dependencies,
    }) => {
      vi.useFakeTimers();

      try {
        const { app, emailService } = dependencies;

        await signup(app, {
          name: "testuser",
          email: "resend@example.com",
          password: "SecurePassword123!",
        });

        emailService.mailer.reset();

        vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

        const res = await resendVerification(app, "resend@example.com");

        expect(res.status).toBe(200);
        expect(emailService.mailer.sentEmails).toHaveLength(1);
        expect(emailService.mailer.sentEmails[0]?.to).toEqual(
          "resend@example.com",
        );
        expect(
          extractToken(emailService.mailer.sentEmails[0]?.body),
        ).toBeTruthy();
      } finally {
        vi.useRealTimers();
      }
    });

    test("new token works after resending verification", async ({
      dependencies,
    }) => {
      vi.useFakeTimers();

      try {
        const { app, emailService } = dependencies;

        await signup(app, {
          name: "testuser",
          email: "resend-works@example.com",
          password: "SecurePassword123!",
        });

        const oldToken = extractToken(emailService.mailer.sentEmails[0]?.body);

        vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

        await resendVerification(app, "resend-works@example.com");

        const newToken = extractToken(emailService.mailer.sentEmails[1]?.body);
        assert(newToken, "No new verification token found");

        assert(oldToken, "No old verification token found");
        const oldRes = await verifyEmail(app, oldToken);
        expect(oldRes.status).toBe(400);

        const res = await verifyEmail(app, newToken);
        expect(res.status).toBe(200);
      } finally {
        vi.useRealTimers();
      }
    });

    test("returns 200 for non-existent email without revealing existence", async ({
      dependencies,
    }) => {
      const { app, emailService } = dependencies;

      const res = await resendVerification(app, "nonexistent@example.com");

      expect(res.status).toBe(200);
      expect(emailService.mailer.sentEmails).toHaveLength(0);
    });

    test("does not send email for already verified account", async ({
      dependencies,
    }) => {
      const { app, emailService } = dependencies;

      await signupAndVerify(app, emailService, {
        name: "testuser",
        email: "already-verified@example.com",
        password: "SecurePassword123!",
      });

      emailService.mailer.reset();

      const res = await resendVerification(app, "already-verified@example.com");

      expect(res.status).toBe(200);
      expect(emailService.mailer.sentEmails).toHaveLength(0);
    });

    test("rate limits requests within 5 minute window", async ({
      dependencies,
    }) => {
      vi.useFakeTimers();

      try {
        const { app, emailService } = dependencies;

        await signup(app, {
          name: "testuser",
          email: "rate-limit-resend@example.com",
          password: "SecurePassword123!",
        });

        emailService.mailer.reset();

        vi.advanceTimersByTime(4 * 60 * 1000 + 1000);

        const res = await resendVerification(
          app,
          "rate-limit-resend@example.com",
        );

        expect(res.status).toBe(429);
        const body: any = await res.json();
        expect(body.cause?.retryAfter).toBeDefined();
        expect(emailService.mailer.sentEmails).toHaveLength(0);
      } finally {
        vi.useRealTimers();
      }
    });

    test("allows request after 5 minute cooldown", async ({ dependencies }) => {
      vi.useFakeTimers();

      try {
        const { app, emailService } = dependencies;

        await signup(app, {
          name: "testuser",
          email: "rate-limit-resend-wait@example.com",
          password: "SecurePassword123!",
        });

        emailService.mailer.reset();

        vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

        const res = await resendVerification(
          app,
          "rate-limit-resend-wait@example.com",
        );

        expect(res.status).toBe(200);
        expect(emailService.mailer.sentEmails).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("POST /v2/auth/forgot-password", () => {
    test("sends password reset email for verified account", async ({
      dependencies,
    }) => {
      const { app, emailService } = dependencies;

      await signupAndVerify(app, emailService, {
        name: "testuser",
        email: "forgot@example.com",
        password: "SecurePassword123!",
      });

      emailService.mailer.reset();

      const res = await forgotPassword(app, "forgot@example.com");

      expect(res.status).toBe(200);
      expect(emailService.mailer.sentEmails).toHaveLength(1);
      expect(emailService.mailer.sentEmails[0]?.to).toEqual(
        "forgot@example.com",
      );
      expect(
        extractToken(emailService.mailer.sentEmails[0]?.body),
      ).toBeTruthy();
    });

    test("returns 200 for non-existent email without revealing existence", async ({
      dependencies,
    }) => {
      const { app, emailService } = dependencies;

      const res = await forgotPassword(app, "nonexistent-forgot@example.com");

      expect(res.status).toBe(200);
      expect(emailService.mailer.sentEmails).toHaveLength(0);
    });

    test("does not send email for unverified account", async ({
      dependencies,
    }) => {
      const { app, emailService } = dependencies;

      await signup(app, {
        name: "testuser",
        email: "unverified-forgot@example.com",
        password: "SecurePassword123!",
      });

      emailService.mailer.reset();

      const res = await forgotPassword(app, "unverified-forgot@example.com");

      expect(res.status).toBe(200);
      expect(emailService.mailer.sentEmails).toHaveLength(0);
    });

    test("rate limits requests within 5 minute window", async ({
      dependencies,
    }) => {
      vi.useFakeTimers();

      try {
        const { app, emailService } = dependencies;

        await signupAndVerify(app, emailService, {
          name: "testuser",
          email: "rate-limit-forgot@example.com",
          password: "SecurePassword123!",
        });

        emailService.mailer.reset();

        await forgotPassword(app, "rate-limit-forgot@example.com");
        expect(emailService.mailer.sentEmails).toHaveLength(1);

        emailService.mailer.reset();

        vi.advanceTimersByTime(4 * 60 * 1000 + 1000);

        const res = await forgotPassword(app, "rate-limit-forgot@example.com");

        expect(res.status).toBe(429);
        const body: any = await res.json();
        expect(body.cause?.retryAfter).toBeDefined();
        expect(emailService.mailer.sentEmails).toHaveLength(0);
      } finally {
        vi.useRealTimers();
      }
    });

    test("allows request after 5 minute cooldown", async ({ dependencies }) => {
      vi.useFakeTimers();

      try {
        const { app, emailService } = dependencies;

        await signupAndVerify(app, emailService, {
          name: "testuser",
          email: "rate-limit-forgot-wait@example.com",
          password: "SecurePassword123!",
        });

        emailService.mailer.reset();

        await forgotPassword(app, "rate-limit-forgot-wait@example.com");
        expect(emailService.mailer.sentEmails).toHaveLength(1);

        emailService.mailer.reset();

        vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

        const res = await forgotPassword(
          app,
          "rate-limit-forgot-wait@example.com",
        );

        expect(res.status).toBe(200);
        expect(emailService.mailer.sentEmails).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("POST /v2/auth/reset-password", () => {
    test("resets password with valid token", async ({ dependencies }) => {
      const { app, emailService } = dependencies;

      await signupAndVerify(app, emailService, {
        name: "testuser",
        email: "reset@example.com",
        password: "OldPassword123!",
      });

      await forgotPassword(app, "reset@example.com");

      const resetToken = extractToken(emailService.mailer.sentEmails[1]?.body);
      assert(resetToken, "No verification token found");

      const res = await resetPassword(app, resetToken, "NewPassword123!");

      expect(res.status).toBe(200);

      const loginRes = await login(app, "reset@example.com", "NewPassword123!");

      expect(loginRes.status).toBe(200);
    });

    test("does not send email for invalid accounts", async ({
      dependencies,
    }) => {
      const { app } = dependencies;

      const res = await resetPassword(
        app,
        "invalid-reset-token",
        "NewPassword123!",
      );

      expect(res.status).toBe(400);
    });

    test("invalidates all sessions after password reset", async ({
      dependencies,
    }) => {
      const { app, emailService } = dependencies;

      await signupAndVerify(app, emailService, {
        name: "testuser",
        email: "session-invalidate@example.com",
        password: "OldPassword123!",
      });

      const loginRes = await login(
        app,
        "session-invalidate@example.com",
        "OldPassword123!",
      );

      const cookies = loginRes.headers.get("set-cookie");

      await forgotPassword(app, "session-invalidate@example.com");

      const resetToken = extractToken(emailService.mailer.sentEmails[1]?.body);
      assert(resetToken, "No verification token found");

      await resetPassword(app, resetToken, "NewPassword123!");

      const meRes = await app.request("/v2/auth/me", {
        method: "GET",
        headers: { Cookie: cookies || "" },
      });

      expect(meRes.status).toBe(401);
    });

    test("token can only be used once", async ({ dependencies }) => {
      const { app, emailService } = dependencies;

      await signupAndVerify(app, emailService, {
        name: "testuser",
        email: "reset-once@example.com",
        password: "OldPassword123!",
      });

      await forgotPassword(app, "reset-once@example.com");

      const resetToken = extractToken(emailService.mailer.sentEmails[1]?.body);
      assert(resetToken, "No verification token found");

      const res1 = await resetPassword(app, resetToken, "NewPassword123!");
      expect(res1.status).toBe(200);

      const res2 = await resetPassword(app, resetToken, "AnotherPassword123!");
      expect(res2.status).toBe(400);
    });
  });
});
