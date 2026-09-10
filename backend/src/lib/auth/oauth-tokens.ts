import {
  type ArkhamDbIdentityState,
  ArkhamDbIdentityStateSchema,
} from "@arkham-build/shared";
import { type Selectable, sql } from "kysely";
import type { Database } from "../../db/db.ts";
import type { AccountIdentity, OauthToken } from "../../db/schema.types.ts";
import type { OAuthAccessToken } from "../oauth.ts";

export type ArkhamDbIdentityWithToken = {
  identity: Selectable<AccountIdentity>;
  token: Selectable<OauthToken>;
  state: ArkhamDbIdentityState | null;
};

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

export async function listArkhamDbIdentitiesNeedingRefresh(
  db: Database,
  refreshBefore: Date,
) {
  const rows = await db
    .selectFrom("account_identity")
    .innerJoin(
      "oauth_token",
      "account_identity.id",
      "oauth_token.account_identity_id",
    )
    .selectAll("account_identity")
    .select([
      "oauth_token.account_identity_id",
      "oauth_token.access_token",
      "oauth_token.refresh_token",
      "oauth_token.token_expires_at",
    ])
    .where("account_identity.provider", "=", "arkhamdb")
    .where(
      sql<boolean>`oauth_token.created_at + interval '7 days' <= ${refreshBefore}`,
    )
    .execute();

  return rows.map((row) => ({
    identity: row,
    token: {
      account_identity_id: row.account_identity_id,
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      token_expires_at: row.token_expires_at,
    },
    state: parseArkhamDbIdentityState(row.state),
  }));
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

function parseArkhamDbIdentityState(value: unknown) {
  return value == null ? null : ArkhamDbIdentityStateSchema.parse(value);
}
