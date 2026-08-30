import type { Database } from "../../../db/db.ts";
import { hashOAuthCredential } from "../../../lib/oauth/crypto.ts";
import {
  lockActiveOAuthClient,
  verifyOAuthClientCredentials,
} from "./client-authentication.ts";

type OAuthRevocationInput = {
  clientId: string;
  clientSecret: string;
  token: string;
};

export async function revokeOAuthToken(
  db: Database,
  input: OAuthRevocationInput,
) {
  const verifiedSecretHash = await verifyOAuthClientCredentials(db, input);
  const tokenHash = hashOAuthCredential(input.token);

  await db.transaction().execute(async (tx) => {
    await lockActiveOAuthClient(tx, input.clientId, verifiedSecretHash);

    const accessToken = await tx
      .selectFrom("oauth_access_token")
      .innerJoin(
        "oauth_grant",
        "oauth_grant.id",
        "oauth_access_token.oauth_grant_id",
      )
      .select([
        "oauth_access_token.id",
        "oauth_grant.oauth_client_id",
        "oauth_access_token.revoked_at",
      ])
      .where("oauth_access_token.token_hash", "=", tokenHash)
      .forUpdate("oauth_access_token")
      .executeTakeFirst();

    if (accessToken?.oauth_client_id === input.clientId) {
      if (accessToken.revoked_at == null) {
        const now = new Date();
        await tx
          .updateTable("oauth_access_token")
          .set({ revoked_at: now, updated_at: now })
          .where("id", "=", accessToken.id)
          .where("revoked_at", "is", null)
          .executeTakeFirstOrThrow();
      }
      return;
    }

    const refreshToken = await tx
      .selectFrom("oauth_refresh_token")
      .innerJoin(
        "oauth_grant",
        "oauth_grant.id",
        "oauth_refresh_token.oauth_grant_id",
      )
      .select([
        "oauth_refresh_token.id",
        "oauth_grant.oauth_client_id",
        "oauth_refresh_token.revoked_at",
      ])
      .where("oauth_refresh_token.token_hash", "=", tokenHash)
      .forUpdate("oauth_refresh_token")
      .executeTakeFirst();

    if (refreshToken?.oauth_client_id !== input.clientId) return;

    const now = new Date();
    if (refreshToken.revoked_at == null) {
      await tx
        .updateTable("oauth_refresh_token")
        .set({ revoked_at: now, updated_at: now })
        .where("id", "=", refreshToken.id)
        .where("revoked_at", "is", null)
        .executeTakeFirstOrThrow();
    }

    await tx
      .updateTable("oauth_access_token")
      .set({ revoked_at: now, updated_at: now })
      .where("oauth_refresh_token_id", "=", refreshToken.id)
      .where("revoked_at", "is", null)
      .execute();
  });
}
