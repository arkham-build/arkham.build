import type { Selectable } from "kysely";
import type { Database } from "../db/db.ts";
import type { OauthToken, Session } from "../db/schema.types.ts";
import type { AccessToken } from "./arkhamdb/types.ts";

export function getOAuthTokenForSession(
  db: Database,
  session: Selectable<Session>,
  provider: string,
): Promise<Selectable<OauthToken> | undefined> {
  return db
    .selectFrom("account_identity")
    .innerJoin(
      "oauth_token",
      "account_identity.account_id",
      "oauth_token.account_identity_id",
    )
    .selectAll("oauth_token")
    .where("account_identity.account_id", "=", session.account_id)
    .where("account_identity.provider", "=", provider)
    .executeTakeFirst();
}

export function upsertOAuthToken(
  db: Database,
  accountIdentityId: string,
  accessToken: AccessToken,
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
