import assert from "node:assert";
import type { SteamIdentityDetails } from "@arkham-build/shared";
import type { Database } from "../../../db/db.ts";
import type { AccountIdentity } from "../../../db/schema.types.ts";
import { createArkhamDbDeckSnapshot } from "../../../lib/arkhamdb/api-client/deck-snapshots.ts";
import {
  getAccountIdentityByAccountIdAndProvider,
  getAccountIdentityByProviderUserId,
} from "../../../lib/auth/account-identities.ts";
import { upsertOAuthToken } from "../../../lib/auth/oauth-tokens.ts";
import { isUniqueViolation } from "../../../lib/db-errors.ts";
import {
  type OAuthAccessToken,
  OAuthFlowError,
  type OAuthProviderIdentity,
} from "../../../lib/oauth.ts";
import {
  assertKnownOAuthProvider,
  assertLoginOAuthProvider,
  getLoginOAuthProviders,
  type OAuthProviderName,
} from "../lib/oauth-identities.ts";

export async function createEmailIdentity(
  db: Database,
  accountId: string,
  pendingEmail: string,
  passwordHash: string,
) {
  return await db
    .insertInto("account_identity")
    .values({
      account_id: accountId,
      provider: "email",
      provider_user_id: null,
      email: null,
      pending_email: pendingEmail,
      password_hash: passwordHash,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export interface ConnectOAuthIdentityToAccountParams {
  accountId: string;
  provider: string;
  providerUserId: string;
  accessToken: OAuthAccessToken;
  initialArkhamDbDeckSnapshot?: OAuthProviderIdentity["initialArkhamDbDeckSnapshot"];
}

export interface ConnectSteamIdentityToAccountParams {
  accountId: string;
  profile: SteamIdentityDetails;
  providerUserId: string;
}

interface UpsertExternalIdentityParams {
  accountId: string;
  provider: OAuthProviderName;
  providerUserId: string;
  state: AccountIdentity["state"];
}

export async function connectSteamIdentityToAccount(
  db: Database,
  params: ConnectSteamIdentityToAccountParams,
) {
  return await db.transaction().execute(async (tx) =>
    upsertExternalIdentity(tx, {
      accountId: params.accountId,
      provider: "steam",
      providerUserId: params.providerUserId,
      state: params.profile,
    }),
  );
}

export async function connectOAuthIdentityToAccount(
  db: Database,
  params: ConnectOAuthIdentityToAccountParams,
) {
  const provider = params.provider;
  assertLoginOAuthProvider(provider);

  return await db.transaction().execute(async (tx) => {
    const accountIdentity = await upsertExternalIdentity(tx, {
      accountId: params.accountId,
      provider,
      providerUserId: params.providerUserId,
      state: null,
    });

    await upsertOAuthToken(tx, accountIdentity.id, params.accessToken);
    await createInitialArkhamDbDeckSnapshot(tx, accountIdentity.id, params);

    return accountIdentity;
  });
}

export async function disconnectOAuthIdentity(
  db: Database,
  accountId: string,
  provider: string,
) {
  assertKnownOAuthProvider(provider);

  return await db
    .deleteFrom("account_identity")
    .where("account_id", "=", accountId)
    .where("provider", "=", provider)
    .executeTakeFirst();
}

export async function deleteEmailIdentity(
  db: Database,
  accountIdentityId: string,
) {
  return await db
    .deleteFrom("account_identity")
    .where("provider", "=", "email")
    .where("id", "=", accountIdentityId)
    .executeTakeFirst();
}

export async function countUsableLoginIdentities(
  db: Database,
  accountId: string,
) {
  const result = await db
    .selectFrom("account_identity")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .where("account_id", "=", accountId)
    .where((eb) =>
      eb.or([
        eb.and([
          eb("provider", "=", "email"),
          eb("verified_at", "is not", null),
          eb("password_hash", "is not", null),
        ]),
        eb("provider", "in", getLoginOAuthProviders()),
      ]),
    )
    .executeTakeFirstOrThrow();

  return Number(result.count);
}

export async function updateAccountIdentityPendingEmail(
  db: Database,
  accountIdentityId: string,
  pendingEmail: string | null,
) {
  return await db
    .updateTable("account_identity")
    .set({ pending_email: pendingEmail, updated_at: new Date() })
    .where("provider", "=", "email")
    .where("id", "=", accountIdentityId)
    .executeTakeFirst();
}

export async function activatePendingAccountIdentityEmail(
  db: Database,
  accountIdentityId: string,
  email: string,
) {
  const now = new Date();
  return await db
    .updateTable("account_identity")
    .set({
      email,
      pending_email: null,
      provider_user_id: email,
      updated_at: now,
      verified_at: now,
    })
    .where("provider", "=", "email")
    .where("id", "=", accountIdentityId)
    .where("pending_email", "=", email)
    .executeTakeFirst();
}

export async function updateAccountIdentityVerified(
  db: Database,
  accountIdentityId: string,
) {
  const now = new Date();
  return await db
    .updateTable("account_identity")
    .set({ verified_at: now, updated_at: now })
    .where("id", "=", accountIdentityId)
    .executeTakeFirst();
}

export async function updateAccountIdentityPasswordHash(
  db: Database,
  accountIdentityId: string,
  passwordHash: string,
) {
  return await db
    .updateTable("account_identity")
    .set({ password_hash: passwordHash, updated_at: new Date() })
    .where("provider", "=", "email")
    .where("id", "=", accountIdentityId)
    .executeTakeFirst();
}

async function assertProviderUserIdAvailable(
  db: Database,
  accountId: string,
  provider: string,
  providerUserId: string,
) {
  const existingIdentity = await getAccountIdentityByProviderUserId(
    db,
    provider,
    providerUserId,
  );

  if (existingIdentity && existingIdentity.account_id !== accountId) {
    throw new OAuthFlowError("identity_belongs_to_another_account");
  }
}

async function upsertExternalIdentity(
  db: Database,
  params: UpsertExternalIdentityParams,
) {
  await assertProviderUserIdAvailable(
    db,
    params.accountId,
    params.provider,
    params.providerUserId,
  );

  const existingIdentity = await getAccountIdentityByAccountIdAndProvider(
    db,
    params.accountId,
    params.provider,
  );

  const now = new Date();

  if (existingIdentity) {
    assert(
      existingIdentity.provider_user_id === params.providerUserId,
      "OAuth identity provider user ID does not match the existing identity.",
    );

    return await db
      .updateTable("account_identity")
      .set({ state: params.state, updated_at: now, verified_at: now })
      .where("id", "=", existingIdentity.id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  try {
    return await db
      .insertInto("account_identity")
      .values({
        account_id: params.accountId,
        provider: params.provider,
        provider_user_id: params.providerUserId,
        state: params.state,
        verified_at: now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new OAuthFlowError("identity_belongs_to_another_account");
    }

    throw error;
  }
}

async function createInitialArkhamDbDeckSnapshot(
  db: Database,
  accountIdentityId: string,
  params: ConnectOAuthIdentityToAccountParams,
) {
  if (!params.initialArkhamDbDeckSnapshot) return;

  await createArkhamDbDeckSnapshot(
    db,
    accountIdentityId,
    params.initialArkhamDbDeckSnapshot.lastModified,
    params.initialArkhamDbDeckSnapshot.decks,
  );
}
