import type { Selectable } from "kysely";
import type { Database } from "../../db/db.ts";
import { parseArkhamDbIdentityState } from "../../features/auth/lib/mapping.ts";
import type { OAuthAccessToken } from "../oauth.ts";
import type { AccountIdentity, OauthToken } from "../../db/schema.types.ts";
import type { ArkhamDbIdentityState } from "@arkham-build/shared";

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

export type ArkhamDbIdentityWithToken = {
  identity: Selectable<AccountIdentity>;
  token: Selectable<OauthToken>;
  state: ArkhamDbIdentityState | null;
};

export async function findArkhamDbIdentityWithTokenByAccountId(
  db: Database,
  accountId: string,
): Promise<ArkhamDbIdentityWithToken | undefined> {
  const identity = await db
    .selectFrom("account_identity")
    .selectAll()
    .where("account_id", "=", accountId)
    .where("provider", "=", "arkhamdb")
    .executeTakeFirst();

  if (!identity) {
    return undefined;
  }

  const token = await db
    .selectFrom("oauth_token")
    .selectAll()
    .where("account_identity_id", "=", identity.id)
    .executeTakeFirst();

  if (!token) {
    return undefined;
  }

  return {
    identity,
    token,
    state: parseArkhamDbIdentityState(identity.state),
  };
}
