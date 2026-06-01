import assert from "node:assert";
import type { Context } from "hono";
import type { Selectable } from "kysely";
import type { Database } from "../../../../db/db.ts";
import type { OauthToken } from "../../../../db/schema.types.ts";
import type { HonoEnv } from "../../../hono-env.ts";
import type { OAuthAccessToken } from "../../../oauth.ts";
import { refreshAccessToken } from "../api-oauth.ts";
import { ApiError } from "./errors.ts";
import { baseHeaders } from "./headers.ts";
import { request, type WrappedResponse } from "./request.ts";

export type Hooks = {
  error?: (c: Context<HonoEnv>, err: unknown) => Promise<void>;
  success?: (
    c: Context<HonoEnv>,
    res: WrappedResponse<unknown> | undefined,
  ) => Promise<void>;
  unauthenticated?: (
    c: Context<HonoEnv>,
    accessToken: OAuthAccessToken,
    err: ApiError,
  ) => Promise<OAuthAccessToken | void>;
};

export const authenticationHooks: Hooks = {
  async unauthenticated(c) {
    const account = c.get("account");

    if (!account) {
      return;
    }

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

type AuthenticatedRequestOptions = {
  hooks?: Hooks;
  retryCount?: number;
};

export async function authenticatedRequest<T>(
  c: Context<HonoEnv>,
  path: string,
  accessToken: OAuthAccessToken,
  options: RequestInit = {},
  authOptions: AuthenticatedRequestOptions = {},
): Promise<WrappedResponse<T>> {
  const { hooks, retryCount = 1 } = authOptions;

  try {
    const res = await request<T>(c, `/api/oauth2${path}`, {
      ...options,
      headers: {
        ...baseHeaders(options.method),
        ...options?.headers,
        Authorization: `Bearer ${accessToken.access_token}`,
      },
    });

    await hooks?.success?.(c, res);
    return res;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && retryCount > 0) {
      const nextAccessToken = await hooks?.unauthenticated?.(
        c,
        accessToken,
        err,
      );

      if (!nextAccessToken) {
        throw err;
      }

      return authenticatedRequest<T>(c, path, nextAccessToken, options, {
        hooks: authenticationHooks,
        retryCount: retryCount - 1,
      });
    }

    await hooks?.error?.(c, err);
    throw err;
  }
}

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
