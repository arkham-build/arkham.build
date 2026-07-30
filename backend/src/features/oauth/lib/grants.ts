import type { OAuthGrantListResponse } from "@arkham-build/shared";
import type { Database } from "../../../db/db.ts";
import { canonicalizeOAuthScopes } from "./scopes.ts";

export async function listOAuthGrants(
  db: Database,
  accountId: string,
): Promise<OAuthGrantListResponse> {
  const grants = await db
    .selectFrom("oauth_grant")
    .innerJoin("oauth_client", "oauth_client.id", "oauth_grant.oauth_client_id")
    .select([
      "oauth_client.id as client_id",
      "oauth_client.name as client_name",
      "oauth_client.disabled_at",
      "oauth_grant.scopes",
      "oauth_grant.created_at",
      "oauth_grant.updated_at",
    ])
    .where("oauth_grant.account_id", "=", accountId)
    .orderBy("oauth_grant.updated_at", "desc")
    .orderBy("oauth_client.id")
    .execute();

  return {
    grants: grants.map((grant) => ({
      client: {
        id: grant.client_id,
        name: grant.client_name,
        status: grant.disabled_at == null ? "active" : "disabled",
      },
      scopes: canonicalizeOAuthScopes(grant.scopes),
      grantedAt: grant.created_at.toISOString(),
      lastAuthorizedAt: grant.updated_at.toISOString(),
    })),
  };
}

export async function revokeOAuthGrant(
  db: Database,
  accountId: string,
  clientId: string,
) {
  await db.transaction().execute(async (tx) => {
    await tx
      .selectFrom("oauth_client")
      .select("id")
      .where("id", "=", clientId)
      .forUpdate()
      .executeTakeFirst();

    await tx
      .deleteFrom("oauth_authorization_request")
      .where("account_id", "=", accountId)
      .where("oauth_client_id", "=", clientId)
      .where("consumed_at", "is", null)
      .execute();

    await tx
      .deleteFrom("oauth_grant")
      .where("account_id", "=", accountId)
      .where("oauth_client_id", "=", clientId)
      .execute();
  });
}
