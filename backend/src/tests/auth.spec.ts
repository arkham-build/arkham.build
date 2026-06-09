/** biome-ignore-all lint/suspicious/noExplicitAny: test code */
import assert from "node:assert";
import type { Hono } from "hono";
import { describe, expect, vi } from "vitest";
import { appFactory } from "../app.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import type { MockMailer } from "./mocks/email.ts";
import { TEST_ACCOUNT, test } from "./test-utils.ts";

describe("Auth routes", () => {
  describe("OAuth start routes", () => {
    test.for([
      { path: "/auth/arkhamdb/login", authenticated: false },
      { path: "/auth/arkhamdb/signup", authenticated: false },
      { path: "/auth/arkhamdb/connect", authenticated: true },
    ])("GET $path redirects to arkhamdb oauth", async ({
      path,
      authenticated,
    }, { dependencies }) => {
      const { app, config, sessionCookie } = dependencies;

      const res = await app.request(path, {
        method: "GET",
        headers: authenticated ? { Cookie: sessionCookie } : {},
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

      await db
        .insertInto("deck")
        .values({
          account_id: account.id,
          id: "123",
          investigator_code: "01001",
          investigator_name: "Roland Banks",
          meta: {},
          name: "Arkham Synced Deck",
          provider_type: "arkhamdb",
          slots: { "01006": 1 },
          version: "1.2",
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
          .innerJoin("account", "account.id", "account_identity.account_id")
          .select([
            "account.profile_completed",
            "account_identity.provider",
            "account_identity.provider_user_id",
          ])
          .where("provider", "=", "arkhamdb")
          .where("provider_user_id", "=", "12345")
          .executeTakeFirst();

        expect(identity).toMatchObject({
          profile_completed: false,
          provider: "arkhamdb",
          provider_user_id: "12345",
        });

        const cookie = res.headers.get("set-cookie") ?? "";
        const meRes = await app.request("/v2/auth/me", {
          method: "GET",
          headers: { Cookie: cookie },
        });

        expect(meRes.status).toBe(200);
        expect(await meRes.json()).toMatchObject({
          account: { profileComplete: false },
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

    test("reconnect clears stale unhealthy arkhamdb state", async ({
      dependencies,
    }) => {
      const { app, config, db, sessionCookie } = dependencies;

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
          state: {
            lastError: "boom",
            lastSyncedAt: "2026-06-04T12:00:00.000Z",
            status: "unhealthy",
            username: "arkham-user",
          },
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
          `${config.FRONTEND_URL}/settings?tab=account`,
        );

        const sessionRes = await app.request("/v2/auth/me", {
          method: "GET",
          headers: { Cookie: sessionCookie },
        });

        expect(sessionRes.status).toBe(200);
        const body = (await sessionRes.json()) as { identities: unknown[] };
        expect(body.identities).toContainEqual(
          expect.objectContaining({
            provider: "arkhamdb",
            providerUserId: "12345",
            details: {
              status: "healthy",
              lastSyncedAt: null,
              lastError: null,
              username: null,
            },
          }),
        );
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

  describe("POST /v2/auth/complete-profile", () => {
    test("completes an incomplete OAuth profile", async ({ dependencies }) => {
      const { app, config, db } = dependencies;

      const account = await db
        .insertInto("account")
        .values({ name: "provider_incomplete", profile_completed: false })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "incomplete",
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

      const cookie = `${config.SESSION_COOKIE_NAME}=${session.id}`;

      const blockedRes = await app.request("/v2/auth/email", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "incomplete@example.com",
          password: "SecurePassword123!",
        }),
      });

      expect(blockedRes.status).toBe(403);
      expect(await blockedRes.text()).toContain("Profile completion required");

      const res = await app.request("/v2/auth/complete-profile", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ username: "complete-user" }),
      });

      expect(res.status).toBe(200);

      const updatedAccount = await db
        .selectFrom("account")
        .select(["name", "profile_completed"])
        .where("id", "=", account.id)
        .executeTakeFirstOrThrow();

      expect(updatedAccount).toEqual({
        name: "complete-user",
        profile_completed: true,
      });
    });
  });

  describe("POST /v2/auth/signup", () => {
    test("creates a new account and sends verification email", async ({
      dependencies,
    }) => {
      const { app, mailer } = dependencies;

      const res = await signup(app, {
        name: "testuser",
        email: "test@example.com",
        password: "SecurePassword123!",
      });

      expect(res.status).toBe(201);
      expect(mailer.sentEmails).toHaveLength(1);
      const token = extractToken(mailer.sentEmails[0]?.body);
      expect(token).toBeTruthy();
      expect(mailer.sentEmails[0]?.body).toContain(
        "Or copy and paste this verification token:",
      );
      expect(mailer.sentEmails[0]?.body).toContain(`\n${token}\n`);
      expect(mailer.sentEmails[0]?.to).toEqual("test@example.com");
    });

    test("does not create an account or verification token when email sending fails", async ({
      dependencies,
    }) => {
      const { app, db, mailer } = dependencies;

      mailer.failOnce();

      const res = await signup(app, {
        name: "signup-email-fail",
        email: "signup-email-fail@example.com",
        password: "SecurePassword123!",
      });

      expect(res.status).toBe(500);
      expect(mailer.sentEmails).toHaveLength(0);

      const account = await db
        .selectFrom("account")
        .select(["id"])
        .where("name", "=", "signup-email-fail")
        .executeTakeFirst();

      expect(account).toBeUndefined();
      expect(
        await countVerificationTokens(
          db,
          "signup-email-fail@example.com",
          "email_verification",
        ),
      ).toBe(0);
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

    test("requires captcha when turnstile is enabled", async ({
      dependencies,
    }) => {
      const { config, db, mailer, dispatcher } = dependencies;
      const app = appFactory(
        {
          ...config,
          TURNSTILE_SECRET_KEY: "turnstile-secret",
        },
        db,
        dispatcher,
      );

      const res = await signup(app, {
        name: "captcha-required",
        email: "captcha-required@example.com",
        password: "SecurePassword123!",
      });

      expect(res.status).toBe(400);
      expect(await res.text()).toContain("Captcha is required");
      expect(mailer.sentEmails).toHaveLength(0);
    });

    test("verifies captcha when turnstile is enabled", async ({
      dependencies,
    }) => {
      const { config, db, mailer, dispatcher } = dependencies;
      const app = appFactory(
        {
          ...config,
          TURNSTILE_SECRET_KEY: "turnstile-secret",
        },
        db,
        dispatcher,
      );

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      try {
        const res = await signup(app, {
          name: "captcha-success",
          email: "captcha-success@example.com",
          password: "SecurePassword123!",
          captchaToken: "captcha-token",
        });

        expect(res.status).toBe(201);
        expect(globalThis.fetch).toHaveBeenCalledWith(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          expect.objectContaining({
            method: "POST",
            body: expect.any(URLSearchParams),
          }),
        );
        expect(mailer.sentEmails).toHaveLength(1);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    test("rejects invalid captcha when turnstile is enabled", async ({
      dependencies,
    }) => {
      const { config, db, mailer, dispatcher } = dependencies;
      const app = appFactory(
        {
          ...config,
          TURNSTILE_SECRET_KEY: "turnstile-secret",
        },
        db,
        dispatcher,
      );

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              "error-codes": ["invalid-input-response"],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      );

      try {
        const res = await signup(app, {
          name: "captcha-fail",
          email: "captcha-fail@example.com",
          password: "SecurePassword123!",
          captchaToken: "captcha-token",
        });

        expect(res.status).toBe(400);
        expect(await res.text()).toContain("Captcha verification failed");
        expect(mailer.sentEmails).toHaveLength(0);
      } finally {
        vi.unstubAllGlobals();
      }
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
      const { app, mailer } = dependencies;

      await signup(app, {
        name: "testuser",
        email: "verify@example.com",
        password: "SecurePassword123!",
      });

      const token = extractToken(mailer.sentEmails[0]?.body);
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
      const { app, mailer } = dependencies;

      await signup(app, {
        name: "testuser",
        email: "once@example.com",
        password: "SecurePassword123!",
      });

      const token = extractToken(mailer.sentEmails[0]?.body);
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
      const { app, mailer } = dependencies;

      await signupAndVerify(app, mailer, {
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
      const { app, mailer } = dependencies;

      await signupAndVerify(app, mailer, {
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

    test("does not log in banned users", async ({ dependencies }) => {
      const { app, db, mailer } = dependencies;

      await signupAndVerify(app, mailer, {
        name: "testuser",
        email: "banned@example.com",
        password: "SecurePassword123!",
      });

      const account = await db
        .selectFrom("account")
        .select(["id"])
        .where("name", "=", "testuser")
        .executeTakeFirstOrThrow();

      await createModerationAction(db, account.id, "ban");

      const res = await login(app, "banned@example.com", "SecurePassword123!");

      expect(res.status).toBe(403);
      expect(await res.text()).toContain("Account is banned");
    });

    test("allows warned users to log in", async ({ dependencies }) => {
      const { app, db, mailer } = dependencies;

      await signupAndVerify(app, mailer, {
        name: "testuser",
        email: "warned@example.com",
        password: "SecurePassword123!",
      });

      const account = await db
        .selectFrom("account")
        .select(["id"])
        .where("name", "=", "testuser")
        .executeTakeFirstOrThrow();

      await createModerationAction(db, account.id, "warning");

      const res = await login(app, "warned@example.com", "SecurePassword123!");

      expect(res.status).toBe(200);
    });
  });

  describe("GET /v2/auth/me", () => {
    test("returns user information for authenticated user", async ({
      dependencies,
    }) => {
      const { app, mailer } = dependencies;

      await signupAndVerify(app, mailer, {
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
          state: {
            lastError: "boom",
            lastSyncedAt: "2026-06-04T12:00:00.000Z",
            status: "unhealthy",
            username: "arkham-user",
          },
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
              status: "unhealthy",
              lastSyncedAt: "2026-06-04T12:00:00.000Z",
              lastError: "boom",
              username: "arkham-user",
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

    test("returns 403 for banned authenticated users", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;

      const account = await db
        .selectFrom("account")
        .select(["id"])
        .where("name", "=", TEST_ACCOUNT.name)
        .executeTakeFirstOrThrow();

      await createModerationAction(db, account.id, "ban");

      const res = await app.request("/v2/auth/me", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(403);
      expect(await res.text()).toContain("Account is banned");
    });
  });

  describe("POST /v2/auth/email", () => {
    test("requires authentication", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await app.request("/v2/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "new-email@example.com",
          password: "SecurePassword123!",
        }),
      });

      expect(res.status).toBe(401);
    });

    test("creates a new email identity for an oauth-only account", async ({
      dependencies,
    }) => {
      const { app, config, db, mailer } = dependencies;

      const account = await db
        .insertInto("account")
        .values({ name: "oauth-create-email" })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "oauth-create-email-user",
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

      const cookie = `${config.SESSION_COOKIE_NAME}=${session.id}`;

      const res = await createEmailIdentity(
        app,
        cookie,
        "new-email@example.com",
        "SecurePassword123!",
      );

      expect(res.status).toBe(201);
      expect(mailer.sentEmails).toHaveLength(1);
      expect(mailer.sentEmails[0]?.to).toBe("new-email@example.com");

      const meRes = await app.request("/v2/auth/me", {
        method: "GET",
        headers: { Cookie: cookie },
      });

      expect(await meRes.json()).toMatchObject({
        identities: [
          {
            provider: "arkhamdb",
            providerUserId: "oauth-create-email-user",
          },
          {
            provider: "email",
            email: null,
            pendingEmail: "new-email@example.com",
            verified: false,
          },
        ],
      });

      const loginRes = await login(
        app,
        "new-email@example.com",
        "SecurePassword123!",
      );
      expect(loginRes.status).toBe(401);

      const token = extractToken(mailer.sentEmails[0]?.body);
      assert(token, "No verification token found");

      const verifyRes = await verifyEmail(app, token);
      expect(verifyRes.status).toBe(200);

      const verifiedLoginRes = await login(
        app,
        "new-email@example.com",
        "SecurePassword123!",
      );
      expect(verifiedLoginRes.status).toBe(200);
    });

    test("does not create an email identity or verification token when email sending fails", async ({
      dependencies,
    }) => {
      const { app, config, db, mailer } = dependencies;

      const account = await db
        .insertInto("account")
        .values({ name: "oauth-create-email-fail" })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "oauth-create-email-fail-user",
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

      const cookie = `${config.SESSION_COOKIE_NAME}=${session.id}`;

      mailer.failOnce();

      const res = await createEmailIdentity(
        app,
        cookie,
        "new-email-fail@example.com",
        "SecurePassword123!",
      );

      expect(res.status).toBe(500);
      expect(mailer.sentEmails).toHaveLength(0);

      const identity = await db
        .selectFrom("account_identity")
        .select(["id"])
        .where("account_id", "=", account.id)
        .where("provider", "=", "email")
        .executeTakeFirst();

      expect(identity).toBeUndefined();
      expect(
        await countVerificationTokens(
          db,
          "new-email-fail@example.com",
          "email_verification",
        ),
      ).toBe(0);
    });

    test("rejects creating an email identity when one already exists", async ({
      dependencies,
    }) => {
      const { app, sessionCookie } = dependencies;

      const res = await createEmailIdentity(
        app,
        sessionCookie,
        "new-email@example.com",
        "SecurePassword123!",
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toContain("Email identity already exists");
    });

    test("rejects creating an email identity with a duplicate email", async ({
      dependencies,
    }) => {
      const { app, config, db } = dependencies;

      const account = await db
        .insertInto("account")
        .values({ name: "oauth-duplicate-email" })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "oauth-duplicate-email-user",
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

      const cookie = `${config.SESSION_COOKIE_NAME}=${session.id}`;

      const res = await createEmailIdentity(
        app,
        cookie,
        TEST_ACCOUNT.email,
        "SecurePassword123!",
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toContain(
        "An account is already registered for this email",
      );
    });

    test("rejects creating an email identity with a duplicate pending email", async ({
      dependencies,
    }) => {
      const { app, config, db } = dependencies;

      const account = await db
        .insertInto("account")
        .values({ name: "oauth-duplicate-pending-email" })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "email",
          pending_email: "reserved@example.com",
          password_hash: "hash",
        })
        .executeTakeFirstOrThrow();

      const oauthAccount = await db
        .insertInto("account")
        .values({ name: "oauth-duplicate-pending-email-target" })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: oauthAccount.id,
          provider: "arkhamdb",
          provider_user_id: "oauth-duplicate-pending-email-target-user",
          verified_at: new Date(),
        })
        .executeTakeFirstOrThrow();

      const session = await db
        .insertInto("session")
        .values({
          account_id: oauthAccount.id,
          expires_at: new Date(Date.now() + 60 * 60 * 1000),
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      const cookie = `${config.SESSION_COOKIE_NAME}=${session.id}`;

      const res = await createEmailIdentity(
        app,
        cookie,
        "reserved@example.com",
        "SecurePassword123!",
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toContain(
        "An account is already registered for this email",
      );
    });

    test("does not reserve the pending email for signup", async ({
      dependencies,
    }) => {
      const { app, config, db } = dependencies;

      const account = await db
        .insertInto("account")
        .values({ name: "oauth-pending-email-signup" })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "oauth-pending-email-signup-user",
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

      const cookie = `${config.SESSION_COOKIE_NAME}=${session.id}`;

      const pendingRes = await createEmailIdentity(
        app,
        cookie,
        "shared@example.com",
        "SecurePassword123!",
      );
      expect(pendingRes.status).toBe(201);

      const signupRes = await signup(app, {
        name: "shared-email-signup",
        email: "shared@example.com",
        password: "SecurePassword123!",
      });

      expect(signupRes.status).toBe(201);
    });

    test("invalidates the pending email token when another verification token is generated for the same email", async ({
      dependencies,
    }) => {
      const { app, config, db, mailer } = dependencies;

      const account = await db
        .insertInto("account")
        .values({ name: "oauth-pending-email-verify" })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "oauth-pending-email-verify-user",
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

      const cookie = `${config.SESSION_COOKIE_NAME}=${session.id}`;

      const pendingRes = await createEmailIdentity(
        app,
        cookie,
        "claimed@example.com",
        "SecurePassword123!",
      );
      expect(pendingRes.status).toBe(201);

      const pendingToken = extractToken(mailer.sentEmails[0]?.body);
      assert(pendingToken, "No verification token found");

      await signupAndVerify(app, mailer, {
        name: "claimed-email-user",
        email: "claimed@example.com",
        password: "SecurePassword123!",
      });

      const verifyRes = await verifyEmail(app, pendingToken);
      expect(verifyRes.status).toBe(400);
      expect(await verifyRes.text()).toContain(
        "Invalid or expired verification token",
      );
    });
  });

  describe("PATCH /v2/auth/credentials", () => {
    test("requires authentication", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await app.request("/v2/auth/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: TEST_ACCOUNT.password,
          newEmail: "updated@example.com",
        }),
      });

      expect(res.status).toBe(401);
    });

    test("starts an email change and stores the pending email", async ({
      dependencies,
    }) => {
      const { app, mailer, sessionCookie } = dependencies;

      const res = await updateCredentials(app, sessionCookie, {
        currentPassword: TEST_ACCOUNT.password,
        newEmail: "updated@example.com",
      });

      expect(res.status).toBe(200);
      expect(mailer.sentEmails).toHaveLength(1);
      expect(mailer.sentEmails[0]?.to).toBe("updated@example.com");

      const meRes = await app.request("/v2/auth/me", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });

      expect(meRes.status).toBe(200);
      expect(await meRes.json()).toMatchObject({
        identities: [
          {
            provider: "email",
            email: TEST_ACCOUNT.email,
            pendingEmail: "updated@example.com",
            verified: true,
          },
        ],
      });
    });

    test("rejects changing to a duplicate pending email", async ({
      dependencies,
    }) => {
      const { app, db, sessionCookie } = dependencies;

      const account = await db
        .insertInto("account")
        .values({ name: "duplicate-pending-email-owner" })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "email",
          pending_email: "reserved@example.com",
          password_hash: "hash",
        })
        .executeTakeFirstOrThrow();

      const res = await updateCredentials(app, sessionCookie, {
        currentPassword: TEST_ACCOUNT.password,
        newEmail: "reserved@example.com",
      });

      expect(res.status).toBe(400);
      expect(await res.text()).toContain(
        "An account is already registered for this email",
      );
    });

    test("does not persist credential changes when email sending fails", async ({
      dependencies,
    }) => {
      const { app, db, mailer, sessionCookie } = dependencies;

      mailer.failOnce();

      const res = await updateCredentials(app, sessionCookie, {
        currentPassword: TEST_ACCOUNT.password,
        newEmail: "updated-fail@example.com",
        newPassword: "NewPassword123!",
      });

      expect(res.status).toBe(500);
      expect(mailer.sentEmails).toHaveLength(0);

      const identity = await db
        .selectFrom("account_identity")
        .select(["pending_email"])
        .where("provider", "=", "email")
        .where("email", "=", TEST_ACCOUNT.email)
        .executeTakeFirstOrThrow();

      expect(identity.pending_email).toBeNull();

      const oldLoginRes = await login(
        app,
        TEST_ACCOUNT.email,
        TEST_ACCOUNT.password,
      );
      expect(oldLoginRes.status).toBe(200);

      const newLoginRes = await login(
        app,
        "updated-fail@example.com",
        "NewPassword123!",
      );
      expect(newLoginRes.status).toBe(401);

      expect(
        await countVerificationTokens(
          db,
          "updated-fail@example.com",
          "email_verification",
        ),
      ).toBe(0);
    });

    test("changes the password", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const res = await updateCredentials(app, sessionCookie, {
        currentPassword: TEST_ACCOUNT.password,
        newPassword: "NewPassword123!",
      });

      expect(res.status).toBe(200);

      const oldLoginRes = await login(
        app,
        TEST_ACCOUNT.email,
        TEST_ACCOUNT.password,
      );
      expect(oldLoginRes.status).toBe(401);

      const newLoginRes = await login(
        app,
        TEST_ACCOUNT.email,
        "NewPassword123!",
      );
      expect(newLoginRes.status).toBe(200);
    });

    test("changes email and password together", async ({ dependencies }) => {
      const { app, mailer, sessionCookie } = dependencies;

      const res = await updateCredentials(app, sessionCookie, {
        currentPassword: TEST_ACCOUNT.password,
        newEmail: "updated@example.com",
        newPassword: "NewPassword123!",
      });

      expect(res.status).toBe(200);

      const token = extractToken(mailer.sentEmails[0]?.body);
      assert(token, "No verification token found");

      const verifyRes = await verifyEmail(app, token);
      expect(verifyRes.status).toBe(200);

      const oldLoginRes = await login(
        app,
        TEST_ACCOUNT.email,
        TEST_ACCOUNT.password,
      );
      expect(oldLoginRes.status).toBe(401);

      const newLoginRes = await login(
        app,
        "updated@example.com",
        "NewPassword123!",
      );
      expect(newLoginRes.status).toBe(200);
    });

    test("rejects an incorrect current password", async ({ dependencies }) => {
      const { app, sessionCookie } = dependencies;

      const res = await updateCredentials(app, sessionCookie, {
        currentPassword: "WrongPassword123!",
        newEmail: "updated@example.com",
      });

      expect(res.status).toBe(400);
      expect(await res.text()).toContain("Current password is incorrect");
    });
  });

  describe("DELETE /v2/auth/credentials/pending-email", () => {
    test("requires authentication", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await app.request("/v2/auth/credentials/pending-email", {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
    });

    test("cancels a pending email change", async ({ dependencies }) => {
      const { app, db, mailer, sessionCookie } = dependencies;

      const updateRes = await updateCredentials(app, sessionCookie, {
        currentPassword: TEST_ACCOUNT.password,
        newEmail: "updated@example.com",
      });
      expect(updateRes.status).toBe(200);

      const token = extractToken(mailer.sentEmails[0]?.body);
      assert(token, "No verification token found");

      const cancelRes = await cancelPendingEmailChange(app, sessionCookie);
      expect(cancelRes.status).toBe(200);

      const meRes = await app.request("/v2/auth/me", {
        method: "GET",
        headers: { Cookie: sessionCookie },
      });

      expect(meRes.status).toBe(200);
      expect(await meRes.json()).toMatchObject({
        identities: [
          {
            provider: "email",
            email: TEST_ACCOUNT.email,
            pendingEmail: null,
            verified: true,
          },
        ],
      });

      expect(
        await countVerificationTokens(
          db,
          "updated@example.com",
          "email_verification",
        ),
      ).toBe(0);

      const verifyRes = await verifyEmail(app, token);
      expect(verifyRes.status).toBe(400);
      expect(await verifyRes.text()).toContain(
        "Invalid or expired verification token",
      );
    });

    test("cancels a pending email identity creation", async ({
      dependencies,
    }) => {
      const { app, config, db, mailer } = dependencies;

      const account = await db
        .insertInto("account")
        .values({ name: "oauth-cancel-email-identity" })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await db
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: "arkhamdb",
          provider_user_id: "oauth-cancel-email-identity-user",
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

      const cookie = `${config.SESSION_COOKIE_NAME}=${session.id}`;

      const createRes = await createEmailIdentity(
        app,
        cookie,
        "new-email@example.com",
        "SecurePassword123!",
      );
      expect(createRes.status).toBe(201);

      const token = extractToken(mailer.sentEmails[0]?.body);
      assert(token, "No verification token found");

      const cancelRes = await cancelPendingEmailChange(app, cookie);
      expect(cancelRes.status).toBe(200);

      const meRes = await app.request("/v2/auth/me", {
        method: "GET",
        headers: { Cookie: cookie },
      });

      expect(meRes.status).toBe(200);
      expect(await meRes.json()).toMatchObject({
        identities: [
          {
            provider: "arkhamdb",
            providerUserId: "oauth-cancel-email-identity-user",
          },
        ],
      });

      expect(
        await countVerificationTokens(
          db,
          "new-email@example.com",
          "email_verification",
        ),
      ).toBe(0);

      const verifyRes = await verifyEmail(app, token);
      expect(verifyRes.status).toBe(400);
      expect(await verifyRes.text()).toContain(
        "Invalid or expired verification token",
      );
    });
  });

  describe("POST /v2/auth/logout", () => {
    test("logs out authenticated user", async ({ dependencies }) => {
      const { app, mailer } = dependencies;

      await signupAndVerify(app, mailer, {
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
        const { app, mailer } = dependencies;

        await signup(app, {
          name: "testuser",
          email: "resend@example.com",
          password: "SecurePassword123!",
        });

        mailer.reset();

        vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

        const res = await resendVerification(app, "resend@example.com");

        expect(res.status).toBe(200);
        expect(mailer.sentEmails).toHaveLength(1);
        expect(mailer.sentEmails[0]?.to).toEqual("resend@example.com");
        expect(extractToken(mailer.sentEmails[0]?.body)).toBeTruthy();
      } finally {
        vi.useRealTimers();
      }
    });

    test("does not replace the existing verification token when email sending fails", async ({
      dependencies,
    }) => {
      vi.useFakeTimers();

      try {
        const { app, db, mailer } = dependencies;

        await signup(app, {
          name: "resend-email-fail",
          email: "resend-email-fail@example.com",
          password: "SecurePassword123!",
        });

        const token = extractToken(mailer.sentEmails[0]?.body);
        assert(token, "No verification token found");

        mailer.reset();
        vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
        mailer.failOnce();

        const res = await resendVerification(
          app,
          "resend-email-fail@example.com",
        );

        expect(res.status).toBe(500);
        expect(mailer.sentEmails).toHaveLength(0);
        expect(
          await countVerificationTokens(
            db,
            "resend-email-fail@example.com",
            "email_verification",
          ),
        ).toBe(1);

        const verifyRes = await verifyEmail(app, token);
        expect(verifyRes.status).toBe(200);
      } finally {
        vi.useRealTimers();
      }
    });

    test("new token works after resending verification", async ({
      dependencies,
    }) => {
      vi.useFakeTimers();

      try {
        const { app, mailer } = dependencies;

        await signup(app, {
          name: "testuser",
          email: "resend-works@example.com",
          password: "SecurePassword123!",
        });

        const oldToken = extractToken(mailer.sentEmails[0]?.body);

        vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

        await resendVerification(app, "resend-works@example.com");

        const newToken = extractToken(mailer.sentEmails[1]?.body);
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
      const { app, mailer } = dependencies;

      const res = await resendVerification(app, "nonexistent@example.com");

      expect(res.status).toBe(200);
      expect(mailer.sentEmails).toHaveLength(0);
    });

    test("does not send email for already verified account", async ({
      dependencies,
    }) => {
      const { app, mailer } = dependencies;

      await signupAndVerify(app, mailer, {
        name: "testuser",
        email: "already-verified@example.com",
        password: "SecurePassword123!",
      });

      mailer.reset();

      const res = await resendVerification(app, "already-verified@example.com");

      expect(res.status).toBe(200);
      expect(mailer.sentEmails).toHaveLength(0);
    });

    test("rate limits requests within 5 minute window", async ({
      dependencies,
    }) => {
      vi.useFakeTimers();

      try {
        const { app, mailer } = dependencies;

        await signup(app, {
          name: "testuser",
          email: "rate-limit-resend@example.com",
          password: "SecurePassword123!",
        });

        mailer.reset();

        vi.advanceTimersByTime(4 * 60 * 1000 + 1000);

        const res = await resendVerification(
          app,
          "rate-limit-resend@example.com",
        );

        expect(res.status).toBe(429);
        const body: any = await res.json();
        expect(body.cause?.retryAfter).toBeDefined();
        expect(mailer.sentEmails).toHaveLength(0);
      } finally {
        vi.useRealTimers();
      }
    });

    test("allows request after 5 minute cooldown", async ({ dependencies }) => {
      vi.useFakeTimers();

      try {
        const { app, mailer } = dependencies;

        await signup(app, {
          name: "testuser",
          email: "rate-limit-resend-wait@example.com",
          password: "SecurePassword123!",
        });

        mailer.reset();

        vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

        const res = await resendVerification(
          app,
          "rate-limit-resend-wait@example.com",
        );

        expect(res.status).toBe(200);
        expect(mailer.sentEmails).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("POST /v2/auth/forgot-password", () => {
    test("sends password reset email for verified account", async ({
      dependencies,
    }) => {
      const { app, mailer } = dependencies;

      await signupAndVerify(app, mailer, {
        name: "testuser",
        email: "forgot@example.com",
        password: "SecurePassword123!",
      });

      mailer.reset();

      const res = await forgotPassword(app, "forgot@example.com");

      expect(res.status).toBe(200);
      expect(mailer.sentEmails).toHaveLength(1);
      expect(mailer.sentEmails[0]?.to).toEqual("forgot@example.com");
      expect(extractToken(mailer.sentEmails[0]?.body)).toBeTruthy();
    });

    test("does not replace the existing reset token when email sending fails", async ({
      dependencies,
    }) => {
      vi.useFakeTimers();

      try {
        const { app, db, mailer } = dependencies;

        await signupAndVerify(app, mailer, {
          name: "forgot-email-fail",
          email: "forgot-email-fail@example.com",
          password: "OldPassword123!",
        });

        mailer.reset();

        await forgotPassword(app, "forgot-email-fail@example.com");

        const token = extractToken(mailer.sentEmails[0]?.body);
        assert(token, "No verification token found");

        mailer.reset();
        vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
        mailer.failOnce();

        const res = await forgotPassword(app, "forgot-email-fail@example.com");

        expect(res.status).toBe(500);
        expect(mailer.sentEmails).toHaveLength(0);
        expect(
          await countVerificationTokens(
            db,
            "forgot-email-fail@example.com",
            "password_reset",
          ),
        ).toBe(1);

        const resetRes = await resetPassword(app, token, "NewPassword123!");
        expect(resetRes.status).toBe(200);
      } finally {
        vi.useRealTimers();
      }
    });

    test("returns 200 for non-existent email without revealing existence", async ({
      dependencies,
    }) => {
      const { app, mailer } = dependencies;

      const res = await forgotPassword(app, "nonexistent-forgot@example.com");

      expect(res.status).toBe(200);
      expect(mailer.sentEmails).toHaveLength(0);
    });

    test("does not send email for unverified account", async ({
      dependencies,
    }) => {
      const { app, mailer } = dependencies;

      await signup(app, {
        name: "testuser",
        email: "unverified-forgot@example.com",
        password: "SecurePassword123!",
      });

      mailer.reset();

      const res = await forgotPassword(app, "unverified-forgot@example.com");

      expect(res.status).toBe(200);
      expect(mailer.sentEmails).toHaveLength(0);
    });

    test("rate limits requests within 5 minute window", async ({
      dependencies,
    }) => {
      vi.useFakeTimers();

      try {
        const { app, mailer } = dependencies;

        await signupAndVerify(app, mailer, {
          name: "testuser",
          email: "rate-limit-forgot@example.com",
          password: "SecurePassword123!",
        });

        mailer.reset();

        await forgotPassword(app, "rate-limit-forgot@example.com");
        expect(mailer.sentEmails).toHaveLength(1);

        mailer.reset();

        vi.advanceTimersByTime(4 * 60 * 1000 + 1000);

        const res = await forgotPassword(app, "rate-limit-forgot@example.com");

        expect(res.status).toBe(429);
        const body: any = await res.json();
        expect(body.cause?.retryAfter).toBeDefined();
        expect(mailer.sentEmails).toHaveLength(0);
      } finally {
        vi.useRealTimers();
      }
    });

    test("allows request after 5 minute cooldown", async ({ dependencies }) => {
      vi.useFakeTimers();

      try {
        const { app, mailer } = dependencies;

        await signupAndVerify(app, mailer, {
          name: "testuser",
          email: "rate-limit-forgot-wait@example.com",
          password: "SecurePassword123!",
        });

        mailer.reset();

        await forgotPassword(app, "rate-limit-forgot-wait@example.com");
        expect(mailer.sentEmails).toHaveLength(1);

        mailer.reset();

        vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

        const res = await forgotPassword(
          app,
          "rate-limit-forgot-wait@example.com",
        );

        expect(res.status).toBe(200);
        expect(mailer.sentEmails).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("POST /v2/auth/reset-password", () => {
    test("resets password with valid token", async ({ dependencies }) => {
      const { app, mailer } = dependencies;

      await signupAndVerify(app, mailer, {
        name: "testuser",
        email: "reset@example.com",
        password: "OldPassword123!",
      });

      await forgotPassword(app, "reset@example.com");

      const resetToken = extractToken(mailer.sentEmails[1]?.body);
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
      const { app, mailer } = dependencies;

      await signupAndVerify(app, mailer, {
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

      const resetToken = extractToken(mailer.sentEmails[1]?.body);
      assert(resetToken, "No verification token found");

      await resetPassword(app, resetToken, "NewPassword123!");

      const meRes = await app.request("/v2/auth/me", {
        method: "GET",
        headers: { Cookie: cookies || "" },
      });

      expect(meRes.status).toBe(401);
    });

    test("token can only be used once", async ({ dependencies }) => {
      const { app, mailer } = dependencies;

      await signupAndVerify(app, mailer, {
        name: "testuser",
        email: "reset-once@example.com",
        password: "OldPassword123!",
      });

      await forgotPassword(app, "reset-once@example.com");

      const resetToken = extractToken(mailer.sentEmails[1]?.body);
      assert(resetToken, "No verification token found");

      const res1 = await resetPassword(app, resetToken, "NewPassword123!");
      expect(res1.status).toBe(200);

      const res2 = await resetPassword(app, resetToken, "AnotherPassword123!");
      expect(res2.status).toBe(400);
    });
  });
});

interface SignupParams {
  name: string;
  email: string;
  password: string;
  captchaToken?: string;
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

function createEmailIdentity(
  app: Hono<HonoEnv>,
  cookie: string,
  email: string,
  password: string,
) {
  return app.request("/v2/auth/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ email, password }),
  });
}

function updateCredentials(
  app: Hono<HonoEnv>,
  cookie: string,
  payload: {
    currentPassword: string;
    newEmail?: string;
    newPassword?: string;
  },
) {
  return app.request("/v2/auth/credentials", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });
}

function cancelPendingEmailChange(app: Hono<HonoEnv>, cookie: string) {
  return app.request("/v2/auth/credentials/pending-email", {
    method: "DELETE",
    headers: {
      Cookie: cookie,
    },
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
  mockArkhamDbOAuthResponse([
    {
      id: 1,
      investigator_code: "01001",
      investigator_name: "Roland Banks",
      meta: "{}",
      name: "Arkham Deck",
      problem: "too_few_cards",
      slots: { "01006": 1 },
      user_id: userId,
      version: "1.0",
      xp_spent: 0,
    },
  ]);
}

async function signupAndVerify(
  app: Hono<HonoEnv>,
  mailer: MockMailer,
  params: SignupParams,
) {
  await signup(app, params);
  const token = extractToken(
    mailer.sentEmails[mailer.sentEmails.length - 1]?.body,
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

async function createModerationAction(
  db: HonoEnv["Variables"]["db"],
  accountId: string,
  type: "ban" | "warning",
) {
  return await db
    .insertInto("account_moderation_action")
    .values({
      account_id: accountId,
      scope: "account",
      type,
      reason: `${type} reason`,
    })
    .executeTakeFirstOrThrow();
}

async function countVerificationTokens(
  db: HonoEnv["Variables"]["db"],
  email: string,
  tokenType: "email_verification" | "password_reset",
) {
  const row = await db
    .selectFrom("verification_token")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .where("email", "=", email)
    .where("token_type", "=", tokenType)
    .executeTakeFirstOrThrow();

  return Number(row.count);
}
