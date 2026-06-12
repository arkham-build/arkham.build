import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { getDatabase } from "../../../backend/src/db/db.ts";
import { hashPassword } from "../../../backend/src/features/auth/lib/crypto.ts";
import { createSession } from "../../../backend/src/lib/auth/sessions.ts";
import { apiUrl, databaseUrl, sessionCookieName } from "./env.ts";

export type TestAccount = {
  accountId: string;
  email: string;
  name: string;
  password: string;
};

export function createAccount() {
  return createAccountWithVerification(new Date());
}

export function createUnverifiedAccount() {
  return createAccountWithVerification(null);
}

export async function createAuthenticatedAccount(page: Page) {
  const account = await createAccount();
  const db = getDatabase(databaseUrl);

  try {
    const session = await createSession(db, account.accountId, 720);

    await page.context().addCookies([
      {
        name: sessionCookieName,
        value: session.token,
        url: apiUrl,
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);

    return account;
  } finally {
    await db.destroy();
  }
}

export async function accountExists(accountId: string) {
  const db = getDatabase(databaseUrl);

  try {
    const account = await db
      .selectFrom("account")
      .select("id")
      .where("id", "=", accountId)
      .executeTakeFirst();

    return !!account;
  } finally {
    await db.destroy();
  }
}

export async function getAccountName(accountId: string) {
  const db = getDatabase(databaseUrl);

  try {
    const account = await db
      .selectFrom("account")
      .select("name")
      .where("id", "=", accountId)
      .executeTakeFirstOrThrow();

    return account.name;
  } finally {
    await db.destroy();
  }
}

export async function deleteArkhamDbOAuthToken(accountId: string) {
  const db = getDatabase(databaseUrl);

  try {
    await db
      .deleteFrom("oauth_token")
      .where(
        "account_identity_id",
        "=",
        db
          .selectFrom("account_identity")
          .select("id")
          .where("account_id", "=", accountId)
          .where("provider", "=", "arkhamdb"),
      )
      .execute();
  } finally {
    await db.destroy();
  }
}

async function createAccountWithVerification(
  verifiedAt: Date | null,
): Promise<TestAccount> {
  const db = getDatabase(databaseUrl);
  const suffix = randomUUID();
  const email = `e2e-${suffix}@example.com`;
  const name = `e2e-${suffix}`;
  const password = "SecurePassword123!";

  try {
    const account = await db
      .insertInto("account")
      .values({ name })
      .returning(["id", "name"])
      .executeTakeFirstOrThrow();

    await db
      .insertInto("account_identity")
      .values({
        account_id: account.id,
        email,
        password_hash: await hashPassword(password),
        provider: "email",
        provider_user_id: email,
        verified_at: verifiedAt,
      })
      .executeTakeFirstOrThrow();

    return {
      accountId: account.id,
      email,
      name,
      password,
    };
  } finally {
    await db.destroy();
  }
}
