import type { Transaction } from "kysely";
import type { Database } from "../../../db/db.ts";
import type { DB } from "../../../db/schema.types.ts";
import {
  generateOAuthAuthorizationCode,
  hashOAuthCredential,
} from "../../../lib/oauth/crypto.ts";
import { canonicalizeOAuthScopes } from "./scopes.ts";

export const OAUTH_AUTHORIZATION_CODE_LIFETIME_MS = 5 * 60 * 1000;

export type OAuthConsentErrorCode =
  | "account_banned"
  | "account_not_found"
  | "client_unavailable"
  | "profile_incomplete"
  | "request_not_claimed"
  | "request_owned_by_another_account"
  | "request_unavailable";

export class OAuthConsentError extends Error {
  readonly code: OAuthConsentErrorCode;

  constructor(code: OAuthConsentErrorCode) {
    super(code);
    this.name = "OAuthConsentError";
    this.code = code;
  }
}

export async function claimOAuthAuthorizationRequest(
  db: Database,
  requestToken: string,
  accountId: string,
) {
  return await db.transaction().execute(async (tx) => {
    const { now, request } = await lockOAuthAuthorizationRequest(
      tx,
      requestToken,
      accountId,
      "claim",
    );

    if (!request.account_id) {
      await tx
        .updateTable("oauth_authorization_request")
        .set({
          account_id: accountId,
          claimed_at: now,
          updated_at: now,
        })
        .where("id", "=", request.id)
        .executeTakeFirstOrThrow();
    }

    return {
      client: {
        id: request.oauth_client_id,
        name: request.client_name,
      },
      expiresAt: request.expires_at,
      scopes: canonicalizeOAuthScopes(request.scopes),
    };
  });
}

export async function approveOAuthAuthorizationRequest(
  db: Database,
  requestToken: string,
  accountId: string,
) {
  return await db.transaction().execute(async (tx) => {
    const { now, request } = await lockOAuthAuthorizationRequest(
      tx,
      requestToken,
      accountId,
      "decision",
    );

    await consumeAuthorizationRequest(tx, request.id, "approved", now);
    const grantId = await upsertOAuthGrant(tx, {
      accountId,
      clientId: request.oauth_client_id,
      scopes: request.scopes,
      now,
    });

    const authorizationCode = generateOAuthAuthorizationCode();
    const expiresAt = new Date(
      now.getTime() + OAUTH_AUTHORIZATION_CODE_LIFETIME_MS,
    );
    await tx
      .insertInto("oauth_authorization_code")
      .values({
        code_hash: hashOAuthCredential(authorizationCode),
        expires_at: expiresAt,
        oauth_grant_id: grantId,
        redirect_uri: request.redirect_uri,
        scopes: request.scopes,
      })
      .execute();

    return {
      redirectUrl: createApprovalRedirectUrl(
        request.redirect_uri,
        authorizationCode,
        request.state,
      ),
    };
  });
}

export async function denyOAuthAuthorizationRequest(
  db: Database,
  requestToken: string,
  accountId: string,
) {
  return await db.transaction().execute(async (tx) => {
    const { now, request } = await lockOAuthAuthorizationRequest(
      tx,
      requestToken,
      accountId,
      "decision",
    );

    await consumeAuthorizationRequest(tx, request.id, "denied", now);

    return {
      redirectUrl: createDenialRedirectUrl(request.redirect_uri, request.state),
    };
  });
}

async function lockOAuthAuthorizationRequest(
  tx: Transaction<DB>,
  requestToken: string,
  accountId: string,
  operation: "claim" | "decision",
) {
  const requestTokenHash = hashOAuthCredential(requestToken);
  const requestReference = await tx
    .selectFrom("oauth_authorization_request")
    .select(["id", "oauth_client_id"])
    .where("request_token_hash", "=", requestTokenHash)
    .executeTakeFirst();

  if (!requestReference) {
    throw new OAuthConsentError("request_unavailable");
  }

  const client = await tx
    .selectFrom("oauth_client")
    .select(["disabled_at", "name"])
    .where("id", "=", requestReference.oauth_client_id)
    .forUpdate()
    .executeTakeFirst();

  if (!client || client.disabled_at != null) {
    throw new OAuthConsentError("client_unavailable");
  }

  const account = await lockOAuthAccount(tx, accountId);
  const request = await tx
    .selectFrom("oauth_authorization_request")
    .select([
      "account_id",
      "consumed_at",
      "expires_at",
      "id",
      "oauth_client_id",
      "redirect_uri",
      "scopes",
      "state",
    ])
    .where("id", "=", requestReference.id)
    .where("request_token_hash", "=", requestTokenHash)
    .forUpdate()
    .executeTakeFirst();
  const now = new Date();

  await validateOAuthAccount(tx, account, now);

  if (!request || request.consumed_at != null || request.expires_at <= now) {
    throw new OAuthConsentError("request_unavailable");
  }

  if (request.account_id != null && request.account_id !== accountId) {
    throw new OAuthConsentError("request_owned_by_another_account");
  }

  if (operation === "decision" && request.account_id == null) {
    throw new OAuthConsentError("request_not_claimed");
  }

  const registeredRedirectUri = await tx
    .selectFrom("oauth_client_redirect_uri")
    .select("redirect_uri")
    .where("oauth_client_id", "=", request.oauth_client_id)
    .where("redirect_uri", "=", request.redirect_uri)
    .executeTakeFirst();

  if (!registeredRedirectUri) {
    throw new OAuthConsentError("client_unavailable");
  }

  return { now, request: { ...request, client_name: client.name } };
}

async function lockOAuthAccount(tx: Transaction<DB>, accountId: string) {
  const account = await tx
    .selectFrom("account")
    .select(["id", "profile_completed_at"])
    .where("id", "=", accountId)
    .forUpdate()
    .executeTakeFirst();

  if (!account) {
    throw new OAuthConsentError("account_not_found");
  }

  return account;
}

async function validateOAuthAccount(
  tx: Transaction<DB>,
  account: { id: string; profile_completed_at: Date | null },
  now: Date,
) {
  const activeBan = await tx
    .selectFrom("account_moderation_action")
    .select("id")
    .where("account_id", "=", account.id)
    .where("scope", "=", "account")
    .where("type", "=", "ban")
    .where("created_at", "<=", now)
    .where((eb) => eb.or([eb("ends_at", "is", null), eb("ends_at", ">", now)]))
    .executeTakeFirst();

  if (activeBan) {
    throw new OAuthConsentError("account_banned");
  }

  if (account.profile_completed_at == null) {
    throw new OAuthConsentError("profile_incomplete");
  }
}

async function consumeAuthorizationRequest(
  tx: Transaction<DB>,
  requestId: string,
  decision: "approved" | "denied",
  now: Date,
) {
  await tx
    .updateTable("oauth_authorization_request")
    .set({ consumed_at: now, decision, updated_at: now })
    .where("id", "=", requestId)
    .where("consumed_at", "is", null)
    .executeTakeFirstOrThrow();
}

async function upsertOAuthGrant(
  tx: Transaction<DB>,
  input: {
    accountId: string;
    clientId: string;
    scopes: readonly string[];
    now: Date;
  },
) {
  const existingGrant = await tx
    .selectFrom("oauth_grant")
    .select(["id", "scopes"])
    .where("oauth_client_id", "=", input.clientId)
    .where("account_id", "=", input.accountId)
    .forUpdate()
    .executeTakeFirst();
  const scopes = canonicalizeOAuthScopes([
    ...(existingGrant?.scopes ?? []),
    ...input.scopes,
  ]);

  if (!existingGrant) {
    const grant = await tx
      .insertInto("oauth_grant")
      .values({
        account_id: input.accountId,
        oauth_client_id: input.clientId,
        scopes,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    return grant.id;
  }

  await tx
    .updateTable("oauth_grant")
    .set({ scopes, updated_at: input.now })
    .where("id", "=", existingGrant.id)
    .executeTakeFirstOrThrow();
  return existingGrant.id;
}

function createApprovalRedirectUrl(
  redirectUri: string,
  authorizationCode: string,
  state: string,
) {
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set("code", authorizationCode);
  redirectUrl.searchParams.set("state", state);
  return redirectUrl.toString();
}

function createDenialRedirectUrl(redirectUri: string, state: string) {
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set("error", "access_denied");
  redirectUrl.searchParams.set("state", state);
  return redirectUrl.toString();
}
