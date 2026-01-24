import type { AccessToken } from "../../lib/arkhamdb/types.ts";
import type { Config } from "../../lib/config.ts";
import type { Database } from "../db.ts";
import { getAccountIdentityByUsername } from "./account-identity.ts";
import { upsertOAuthToken } from "./ouath-token.ts";
import { createSession } from "./session.ts";

export interface CreateAccountParams {
  name: string;
  email: string;
  passwordHash: string;
}

export async function createAccount(db: Database, params: CreateAccountParams) {
  return await db.transaction().execute(async (trx) => {
    const account = await trx
      .insertInto("account")
      .values({ name: params.name })
      .returningAll()
      .executeTakeFirstOrThrow();

    const accountIdentity = await trx
      .insertInto("account_identity")
      .values({
        account_id: account.id,
        provider: "email",
        provider_user_id: params.email,
        email: params.email,
        password_hash: params.passwordHash,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { account, accountIdentity };
  });
}

export async function getAccount(db: Database, id: string) {
  return await db
    .selectFrom("account")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export interface CreateAccountFromOAuthParams {
  accessToken: AccessToken;
  config: Config;
  provider: string;
  providerUserId: string;
}

export async function upsertAccountFromOAuth(
  db: Database,
  params: CreateAccountFromOAuthParams,
) {
  return await db.transaction().execute(async (trx) => {
    let accountIdentity = await getAccountIdentityByUsername(
      trx,
      "arkhamdb",
      params.providerUserId,
    );

    if (!accountIdentity) {
      const account = await trx
        .insertInto("account")
        .values({ name: `provider_${params.providerUserId}` })
        .returningAll()
        .executeTakeFirstOrThrow();

      accountIdentity = await trx
        .insertInto("account_identity")
        .values({
          account_id: account.id,
          provider: params.provider,
          provider_user_id: params.providerUserId,
          verified_at: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    await upsertOAuthToken(trx, accountIdentity.id, params.accessToken);

    const session = await createSession(
      trx,
      accountIdentity.account_id,
      params.config.SESSION_EXPIRY_HOURS,
    );

    return session;
  });
}

export async function updateAccountName(
  db: Database,
  accountId: string,
  name: string,
) {
  const now = new Date();
  return await db
    .updateTable("account")
    .set({ name, updated_at: now })
    .where("id", "=", accountId)
    .executeTakeFirst();
}
