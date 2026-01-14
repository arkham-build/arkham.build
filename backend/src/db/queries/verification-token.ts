import type { Database } from "../db.ts";

export interface CreateVerificationTokenParams {
  accountIdentityId: string | null;
  email: string;
  tokenHash: string;
  tokenType: "email_verification" | "password_reset";
  expiryHours: number;
}

export async function createVerificationToken(
  db: Database,
  params: CreateVerificationTokenParams,
) {
  const expiresAt = new Date(Date.now() + params.expiryHours * 60 * 60 * 1000);

  return await db
    .insertInto("verification_token")
    .values({
      account_identity_id: params.accountIdentityId,
      email: params.email,
      token_hash: params.tokenHash,
      token_type: params.tokenType,
      expires_at: expiresAt,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteVerificationTokensByEmail(
  db: Database,
  email: string,
  tokenType: "email_verification" | "password_reset",
) {
  return await db
    .deleteFrom("verification_token")
    .where("email", "=", email)
    .where("token_type", "=", tokenType)
    .executeTakeFirst();
}

export async function consumeVerificationToken(
  db: Database,
  tokenHash: string,
  tokenType: "email_verification" | "password_reset",
) {
  return await db
    .deleteFrom("verification_token")
    .returningAll()
    .where("token_hash", "=", tokenHash)
    .where("token_type", "=", tokenType)
    .where("expires_at", ">", new Date())
    .executeTakeFirst();
}
