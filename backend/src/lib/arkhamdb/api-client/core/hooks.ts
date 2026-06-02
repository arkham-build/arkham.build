import assert from "node:assert";
import type { Context } from "hono";
import type { Selectable } from "kysely";
import type { Database } from "../../../../db/db.ts";
import type { OauthToken } from "../../../../db/schema.types.ts";
import type { HonoEnv, SessionAuthHonoEnv } from "../../../hono-env.ts";
import { type OAuthAccessToken, refreshAccessToken } from "../api-oauth.ts";
import type { ApiError } from "./errors.ts";
import type { WrappedResponse } from "./request.ts";

export type Hooks<E extends HonoEnv = HonoEnv> = {
  error?: (c: Context<E>, err: unknown) => Promise<void>;
  success?: (
    c: Context<E>,
    res: WrappedResponse<unknown> | undefined,
  ) => Promise<void>;
  unauthenticated?: (
    c: Context<E>,
    accessToken: OAuthAccessToken,
    err: ApiError,
  ) => Promise<OAuthAccessToken | undefined>;
};

export const authenticationHooks: Hooks<SessionAuthHonoEnv> = {
  async unauthenticated(c) {
    const account = c.get("account");
    const db = c.get("db");
    const oauthToken = await findOAuthTokenByAccountIdAndProvider(
      db,
      account.id,
      "arkhamdb",
    );

    assert(oauthToken, "Missing OAuth token for account.");
    assert(oauthToken.refresh_token, "Missing OAuth refresh token.");

    const token = await refreshAccessToken(c, oauthToken.refresh_token);
    await upsertOAuthToken(db, oauthToken.account_identity_id, token);
    return token;
  },
};

function findOAuthTokenByAccountIdAndProvider(
  db: Database,
  accountId: string,
  provider: string,
): Promise<Selectable<OauthToken> | undefined> {
  return db
    .selectFrom("account_identity")
    .innerJoin(
      "oauth_token",
      "account_identity.id",
      "oauth_token.account_identity_id",
    )
    .selectAll("oauth_token")
    .where("account_identity.account_id", "=", accountId)
    .where("account_identity.provider", "=", provider)
    .executeTakeFirst();
}

function upsertOAuthToken(
  db: Database,
  accountIdentityId: string,
  accessToken: OAuthAccessToken,
) {
  const expires = Date.now() + accessToken.expires_in * 1000;

  return db
    .insertInto("oauth_token")
    .values({
      account_identity_id: accountIdentityId,
      access_token: accessToken.access_token,
      refresh_token: accessToken.refresh_token,
      token_expires_at: new Date(expires),
    })
    .onConflict((oc) =>
      oc.column("account_identity_id").doUpdateSet({
        access_token: accessToken.access_token,
        refresh_token: accessToken.refresh_token,
        token_expires_at: new Date(expires),
      }),
    )
    .execute();
}
