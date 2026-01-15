import assert from "node:assert";
import type { Hono } from "hono";
import { describe, expect } from "vitest";
import type { EmailService } from "../lib/email.ts";
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

function forgotPassword(app: Hono<HonoEnv>, email: string) {
  return app.request("/v2/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
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
  describe("POST /v2/auth/signup", () => {
    test("creates a new account and sends verification email", async ({
      dependencies,
    }) => {
      const { app, emailService } = dependencies;

      const res = await signup(app, {
        name: "Test User",
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
        name: "Test User",
        email: "duplicate@example.com",
        password: "SecurePassword123!",
      });

      const res = await signup(app, {
        name: "Another User",
        email: "duplicate@example.com",
        password: "AnotherPassword123!",
      });

      expect(res.status).toBe(400);
    });

    test("validates required fields", async ({ dependencies }) => {
      const { app } = dependencies;

      const res = await app.request("/v2/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /v2/auth/verify-email", () => {
    test("verifies email with valid token", async ({ dependencies }) => {
      const { app, emailService } = dependencies;

      await signup(app, {
        name: "Test User",
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
        name: "Test User",
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
        name: "Test User",
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
        name: "Test User",
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
        name: "Test User",
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
        name: "Test User",
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
          name: "Test User",
          email: "me@example.com",
        },
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
        name: "Test User",
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
      const { app, emailService } = dependencies;

      await signup(app, {
        name: "Test User",
        email: "resend@example.com",
        password: "SecurePassword123!",
      });

      emailService.mailer.reset();

      const res = await resendVerification(app, "resend@example.com");

      expect(res.status).toBe(200);
      expect(emailService.mailer.sentEmails).toHaveLength(1);
      expect(emailService.mailer.sentEmails[0]?.to).toEqual(
        "resend@example.com",
      );
      expect(
        extractToken(emailService.mailer.sentEmails[0]?.body),
      ).toBeTruthy();
    });

    test("new token works after resending verification", async ({
      dependencies,
    }) => {
      const { app, emailService } = dependencies;

      await signup(app, {
        name: "Test User",
        email: "resend-works@example.com",
        password: "SecurePassword123!",
      });

      const oldToken = extractToken(emailService.mailer.sentEmails[0]?.body);

      await resendVerification(app, "resend-works@example.com");

      const newToken = extractToken(emailService.mailer.sentEmails[1]?.body);
      assert(newToken, "No new verification token found");

      assert(oldToken, "No old verification token found");
      const oldRes = await verifyEmail(app, oldToken);
      expect(oldRes.status).toBe(400);

      const res = await verifyEmail(app, newToken);
      expect(res.status).toBe(200);
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
        name: "Test User",
        email: "already-verified@example.com",
        password: "SecurePassword123!",
      });

      emailService.mailer.reset();

      const res = await resendVerification(app, "already-verified@example.com");

      expect(res.status).toBe(200);
      expect(emailService.mailer.sentEmails).toHaveLength(0);
    });
  });

  describe("POST /v2/auth/forgot-password", () => {
    test("sends password reset email for verified account", async ({
      dependencies,
    }) => {
      const { app, emailService } = dependencies;

      await signupAndVerify(app, emailService, {
        name: "Test User",
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
        name: "Test User",
        email: "unverified-forgot@example.com",
        password: "SecurePassword123!",
      });

      emailService.mailer.reset();

      const res = await forgotPassword(app, "unverified-forgot@example.com");

      expect(res.status).toBe(200);
      expect(emailService.mailer.sentEmails).toHaveLength(0);
    });
  });

  describe("POST /v2/auth/reset-password", () => {
    test("resets password with valid token", async ({ dependencies }) => {
      const { app, emailService } = dependencies;

      await signupAndVerify(app, emailService, {
        name: "Test User",
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
        name: "Test User",
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
        name: "Test User",
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
