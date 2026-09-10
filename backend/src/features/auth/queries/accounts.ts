import type { Database } from "../../../db/db.ts";
import { createArkhamDbDeckSnapshot } from "../../../lib/arkhamdb/api-client/deck-snapshots.ts";
import { getAccountIdentityByProviderUserId } from "../../../lib/auth/account-identities.ts";
import { upsertOAuthToken } from "../../../lib/auth/oauth-tokens.ts";
import { createSession } from "../../../lib/auth/sessions.ts";
import type { Config } from "../../../lib/config.ts";
import type {
  OAuthAccessToken,
  OAuthProviderIdentity,
} from "../../../lib/oauth.ts";

export interface CreateAccountParams {
  name: string;
  email: string;
  passwordHash: string;
  profileCompletedAt: Date | null;
}

export interface CreateAccountFromOAuthParams {
  accessToken: OAuthAccessToken;
  config: Config;
  initialArkhamDbDeckSnapshot?: OAuthProviderIdentity["initialArkhamDbDeckSnapshot"];
  provider: string;
  providerUserId: string;
}

export async function createAccount(db: Database, params: CreateAccountParams) {
  const account = await db
    .insertInto("account")
    .values({
      name: params.name,
      profile_completed_at: params.profileCompletedAt,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  const accountIdentity = await db
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
}

export async function upsertAccountFromOAuth(
  db: Database,
  params: CreateAccountFromOAuthParams,
) {
  return await db.transaction().execute(async (tx) => {
    let accountIdentity = await getAccountIdentityByProviderUserId(
      tx,
      params.provider,
      params.providerUserId,
    );

    const existing = !!accountIdentity;

    if (!accountIdentity) {
      const account = await tx
        .insertInto("account")
        .values({
          name: `provider_${params.providerUserId}`,
          profile_completed_at: null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      accountIdentity = await tx
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

    await upsertOAuthToken(tx, accountIdentity.id, params.accessToken);

    if (params.initialArkhamDbDeckSnapshot) {
      await createArkhamDbDeckSnapshot(
        tx,
        accountIdentity.id,
        params.initialArkhamDbDeckSnapshot.lastModified,
        params.initialArkhamDbDeckSnapshot.decks,
      );
    }

    const session = await createSession(
      tx,
      accountIdentity.account_id,
      params.config.SESSION_EXPIRY_HOURS,
    );

    return { session, existing };
  });
}

export async function completeAccountProfile(
  db: Database,
  accountId: string,
  name: string,
) {
  const now = new Date();
  return await db
    .updateTable("account")
    .set({ name, profile_completed_at: now, updated_at: now })
    .where("id", "=", accountId)
    .executeTakeFirst();
}
