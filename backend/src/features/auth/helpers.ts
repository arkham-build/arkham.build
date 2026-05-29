import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { Database } from "../../db/db.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { OAuthError } from "./arkhamdb-oauth.ts";
import {
  getAccountIdentityByEmail,
  getLatestVerificationTokenByEmail,
} from "./queries.ts";

export async function assertEmailAvailable(
  db: Database,
  email: string,
  excludeAccountIdentityId?: string,
): Promise<void> {
  const existingEmailIdentity = await getAccountIdentityByEmail(db, email);

  if (
    existingEmailIdentity &&
    existingEmailIdentity.id !== excludeAccountIdentityId
  ) {
    throw new HTTPException(400, {
      message: "An account is already registered for this email",
    });
  }
}

export async function assertVerificationTokenCooldown(
  db: Database,
  email: string,
  tokenType: "email_verification" | "password_reset",
): Promise<void> {
  const latestToken = await getLatestVerificationTokenByEmail(
    db,
    email,
    tokenType,
  );

  if (latestToken) {
    assertEmailCooldown(latestToken.created_at);
  }
}

export function assertEmailCooldown(
  tokenCreatedAt: Date,
  cooldownMs = 5 * 60 * 1000,
): void {
  const retryAfter = new Date(tokenCreatedAt.getTime() + cooldownMs);

  if (Date.now() < retryAfter.getTime()) {
    throw new HTTPException(429, {
      message: "Please wait before requesting another email",
      cause: { retryAfter: retryAfter.toISOString() },
    });
  }
}

export function getOAuthErrorCode(error: unknown) {
  if (error instanceof OAuthError) {
    switch (error.code) {
      case "oauth_missing_code":
      case "arkhamdb_no_decks":
      case "arkhamdb_invalid_response":
      case "invalid_state":
      case "identity_belongs_to_another_account":
        return error.code;
      default:
        return "oauth_failed";
    }
  }

  return "oauth_failed";
}

export function isEmail(input: string): boolean {
  return input.includes("@");
}

export function isUniqueViolation(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export function redirectToOAuthError(
  c: Context<HonoEnv>,
  returnTo: string,
  errorCode: string,
) {
  const url = new URL(returnTo, c.get("config").FRONTEND_URL);
  url.searchParams.set("oauth_error", errorCode);
  return c.redirect(url.toString());
}

export function setSessionCookie(c: Context<HonoEnv>, sessionId: string): void {
  const config = c.get("config");

  setCookie(c, config.SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: config.SESSION_EXPIRY_HOURS * 60 * 60,
    path: "/",
  });
}

export function throwInvalidResetTokenError(): never {
  throw new HTTPException(400, {
    message: "Invalid or expired password reset token",
  });
}
