import type { Selectable } from "kysely";
import type { Database } from "../../../db/db.ts";
import type { OauthToken } from "../../../db/schema.types.ts";
import type { OAuthAccessToken } from "../../../lib/oauth.ts";

export function findOAuthTokenByAccountIdAndProvider(
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

export function upsertOAuthToken(
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
