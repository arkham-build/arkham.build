import type { Database } from "../../../db/db.ts";
import {
  generateOAuthAccessToken,
  generateOAuthRefreshToken,
  hashOAuthCredential,
} from "../../../lib/oauth/crypto.ts";
import {
  lockActiveOAuthClient,
  verifyOAuthClientCredentials,
} from "./client-authentication.ts";
import { OAuthTokenError } from "./errors.ts";
import { revokeOAuthGrantTokens } from "./revocation.ts";
import { canonicalizeOAuthScopes } from "./scopes.ts";

export const OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 60;
export const OAUTH_REFRESH_TOKEN_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;

const OAUTH_ACCESS_TOKEN_LIFETIME_MS =
  OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS * 1000;

type AuthorizationCodeExchangeInput = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

type RefreshTokenExchangeInput = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

type OAuthTokenResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  scopes: string[];
};

export async function exchangeOAuthAuthorizationCode(
  db: Database,
  input: AuthorizationCodeExchangeInput,
): Promise<OAuthTokenResult> {
  const verifiedSecretHash = await verifyOAuthClientCredentials(db, input);

  return await db.transaction().execute(async (tx) => {
    await lockActiveOAuthClient(tx, input.clientId, verifiedSecretHash);

    const codeHash = hashOAuthCredential(input.code);
    const authorizationCodeReference = await tx
      .selectFrom("oauth_authorization_code")
      .select("oauth_grant_id")
      .where("code_hash", "=", codeHash)
      .executeTakeFirst();

    if (!authorizationCodeReference) {
      throw invalidAuthorizationCode();
    }

    const grant = await tx
      .selectFrom("oauth_grant")
      .select(["id", "oauth_client_id"])
      .where("id", "=", authorizationCodeReference.oauth_grant_id)
      .forUpdate()
      .executeTakeFirst();

    if (!grant || grant.oauth_client_id !== input.clientId) {
      throw invalidAuthorizationCode();
    }

    const authorizationCode = await tx
      .selectFrom("oauth_authorization_code")
      .select([
        "expires_at",
        "id",
        "redirect_uri",
        "revoked_at",
        "scopes",
        "used_at",
      ])
      .where("code_hash", "=", codeHash)
      .where("oauth_grant_id", "=", grant.id)
      .forUpdate()
      .executeTakeFirst();

    const now = new Date();

    if (
      !authorizationCode ||
      authorizationCode.used_at != null ||
      authorizationCode.revoked_at != null ||
      authorizationCode.expires_at <= now ||
      authorizationCode.redirect_uri !== input.redirectUri
    ) {
      throw invalidAuthorizationCode();
    }

    const scopes = canonicalizeOAuthScopes(authorizationCode.scopes);
    const refreshToken = generateOAuthRefreshToken();
    const refreshTokenExpiresAt = new Date(
      now.getTime() + OAUTH_REFRESH_TOKEN_LIFETIME_MS,
    );
    const accessToken = generateOAuthAccessToken();
    const accessTokenExpiresAt = new Date(
      now.getTime() + OAUTH_ACCESS_TOKEN_LIFETIME_MS,
    );

    await tx
      .updateTable("oauth_authorization_code")
      .set({ used_at: now, updated_at: now })
      .where("id", "=", authorizationCode.id)
      .where("used_at", "is", null)
      .executeTakeFirstOrThrow();

    const storedRefreshToken = await tx
      .insertInto("oauth_refresh_token")
      .values({
        expires_at: refreshTokenExpiresAt,
        oauth_grant_id: grant.id,
        scopes,
        token_hash: hashOAuthCredential(refreshToken),
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await tx
      .insertInto("oauth_access_token")
      .values({
        expires_at: accessTokenExpiresAt,
        oauth_grant_id: grant.id,
        oauth_refresh_token_id: storedRefreshToken.id,
        scopes,
        token_hash: hashOAuthCredential(accessToken),
      })
      .executeTakeFirstOrThrow();

    return {
      accessToken,
      expiresIn: OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      refreshToken,
      scopes,
    };
  });
}

export async function exchangeOAuthRefreshToken(
  db: Database,
  input: RefreshTokenExchangeInput,
): Promise<OAuthTokenResult> {
  const verifiedSecretHash = await verifyOAuthClientCredentials(db, input);

  const token = await db.transaction().execute(async (tx) => {
    await lockActiveOAuthClient(tx, input.clientId, verifiedSecretHash);

    const refreshTokenHash = hashOAuthCredential(input.refreshToken);
    const refreshTokenReference = await tx
      .selectFrom("oauth_refresh_token")
      .select("oauth_grant_id")
      .where("token_hash", "=", refreshTokenHash)
      .executeTakeFirst();

    if (!refreshTokenReference) {
      throw invalidRefreshToken();
    }

    const grant = await tx
      .selectFrom("oauth_grant")
      .select(["id", "oauth_client_id"])
      .where("id", "=", refreshTokenReference.oauth_grant_id)
      .forUpdate()
      .executeTakeFirst();

    if (!grant || grant.oauth_client_id !== input.clientId) {
      throw invalidRefreshToken();
    }

    const refreshToken = await tx
      .selectFrom("oauth_refresh_token")
      .select(["expires_at", "id", "revoked_at", "rotated_at", "scopes"])
      .where("token_hash", "=", refreshTokenHash)
      .where("oauth_grant_id", "=", grant.id)
      .executeTakeFirst();
    const now = new Date();

    if (!refreshToken) throw invalidRefreshToken();

    if (refreshToken.rotated_at != null) {
      await revokeOAuthGrantTokens(tx, grant.id, now);
      return undefined;
    }

    if (refreshToken.revoked_at != null || refreshToken.expires_at <= now) {
      throw invalidRefreshToken();
    }

    const scopes = canonicalizeOAuthScopes(refreshToken.scopes);
    const replacementRefreshToken = generateOAuthRefreshToken();
    const replacementRefreshTokenExpiresAt = new Date(
      now.getTime() + OAUTH_REFRESH_TOKEN_LIFETIME_MS,
    );
    const accessToken = generateOAuthAccessToken();
    const accessTokenExpiresAt = new Date(
      now.getTime() + OAUTH_ACCESS_TOKEN_LIFETIME_MS,
    );

    await tx
      .updateTable("oauth_refresh_token")
      .set({
        last_used_at: now,
        rotated_at: now,
        updated_at: now,
      })
      .where("id", "=", refreshToken.id)
      .executeTakeFirstOrThrow();

    const storedReplacementRefreshToken = await tx
      .insertInto("oauth_refresh_token")
      .values({
        expires_at: replacementRefreshTokenExpiresAt,
        oauth_grant_id: grant.id,
        scopes,
        token_hash: hashOAuthCredential(replacementRefreshToken),
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await tx
      .insertInto("oauth_access_token")
      .values({
        expires_at: accessTokenExpiresAt,
        oauth_grant_id: grant.id,
        oauth_refresh_token_id: storedReplacementRefreshToken.id,
        scopes,
        token_hash: hashOAuthCredential(accessToken),
      })
      .executeTakeFirstOrThrow();

    return {
      accessToken,
      expiresIn: OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      refreshToken: replacementRefreshToken,
      scopes,
    };
  });

  if (!token) throw invalidRefreshToken();
  return token;
}

function invalidAuthorizationCode() {
  return new OAuthTokenError(
    "invalid_grant",
    "Authorization code is invalid or expired",
  );
}

function invalidRefreshToken() {
  return new OAuthTokenError(
    "invalid_grant",
    "Refresh token is invalid or expired",
  );
}
