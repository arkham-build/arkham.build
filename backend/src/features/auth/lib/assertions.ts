import { HTTPException } from "hono/http-exception";
import type { Database } from "../../../db/db.ts";
import { getAccountIdentityByEmail } from "../../../lib/auth/account-identities.ts";
import { getLatestVerificationTokenByEmail } from "../queries/verification-tokens.ts";

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

export function isEmail(input: string): boolean {
  return input.includes("@");
}

export function throwInvalidResetTokenError(): never {
  throw new HTTPException(400, {
    message: "Invalid or expired password reset token",
  });
}
