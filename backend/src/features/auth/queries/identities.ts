import assert from "node:assert";
import type { Database } from "../../../db/db.ts";
import { createArkhamDbDeckSnapshot } from "../../../lib/arkhamdb/api-client/deck-snapshots.ts";
import {
  getAccountIdentityByAccountIdAndProvider,
  updateAccountIdentityState,
} from "../../../lib/auth/account-identities.ts";
import { upsertOAuthToken } from "../../../lib/auth/oauth-tokens.ts";
import type {
  OAuthAccessToken,
  OAuthProviderIdentity,
} from "../../../lib/oauth.ts";
import type { SteamProfile } from "../../../lib/steam/steam-openid-provider.ts";

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
  profile: SteamProfile;
  providerUserId: string;
}

export async function connectSteamIdentityToAccount(
  db: Database,
  params: ConnectSteamIdentityToAccountParams,
) {
  return await db.transaction().execute(async (tx) => {
    const existingIdentity = await getAccountIdentityByAccountIdAndProvider(
      tx,
      params.accountId,
      "steam",
    );

    const now = new Date();

    if (existingIdentity) {
      assert(
        existingIdentity.provider_user_id === params.providerUserId,
        "Steam identity provider user ID does not match the existing identity.",
      );

      return await tx
        .updateTable("account_identity")
        .set({ state: params.profile, updated_at: now, verified_at: now })
        .where("id", "=", existingIdentity.id)
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    return await tx
      .insertInto("account_identity")
      .values({
        account_id: params.accountId,
        provider: "steam",
        provider_user_id: params.providerUserId,
        state: params.profile,
        verified_at: now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  });
}

export async function connectOAuthIdentityToAccount(
  db: Database,
  params: ConnectOAuthIdentityToAccountParams,
) {
  assertOAuthProvider(params.provider);

  return await db.transaction().execute(async (tx) => {
    const existingIdentity = await getAccountIdentityByAccountIdAndProvider(
      tx,
      params.accountId,
      params.provider,
    );

    if (existingIdentity) {
      assert(
        existingIdentity.provider_user_id === params.providerUserId,
        "OAuth identity provider user ID does not match the existing identity.",
      );

      await upsertOAuthToken(tx, existingIdentity.id, params.accessToken);
      await updateAccountIdentityState(tx, existingIdentity.id, null);
      await createInitialArkhamDbDeckSnapshot(tx, existingIdentity.id, params);
      return existingIdentity;
    }

    const accountIdentity = await tx
      .insertInto("account_identity")
      .values({
        account_id: params.accountId,
        provider: params.provider,
        provider_user_id: params.providerUserId,
        verified_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

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
  assertOAuthProvider(provider);

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
        eb.and([eb("provider", "!=", "email"), eb("provider", "!=", "steam")]),
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

function assertOAuthProvider(provider: string) {
  assert(provider !== "email", "Expected an OAuth provider.");
}
