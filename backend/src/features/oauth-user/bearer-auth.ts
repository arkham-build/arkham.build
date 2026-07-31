import type { OAuthScope } from "@arkham-build/shared";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import { findAccountForAuth } from "../../lib/auth/accounts.ts";
import type { HonoEnv, OAuthBearerHonoEnv } from "../../lib/hono-env.ts";
import { hashOAuthCredential } from "../../lib/oauth/crypto.ts";
import { canonicalizeOAuthScopes } from "../oauth/lib/scopes.ts";
import { OAuthUserErrorSchema } from "./dtos.ts";

type OAuthBearerErrorCode = z.infer<typeof OAuthUserErrorSchema>["error"];

class OAuthBearerError extends Error {
  readonly code: OAuthBearerErrorCode;
  readonly status: 401 | 403;
  readonly requiredScope: OAuthScope | undefined;

  constructor(
    code: OAuthBearerErrorCode,
    message: string,
    status: 401 | 403,
    requiredScope?: OAuthScope,
  ) {
    super(message);
    this.name = "OAuthBearerError";
    this.code = code;
    this.status = status;
    this.requiredScope = requiredScope;
  }
}

export function oauthBearerAuth(
  requiredScopes: readonly OAuthScope[],
): MiddlewareHandler<OAuthBearerHonoEnv> {
  return async (c, next) => {
    try {
      const rawToken = parseBearerToken(c.req.header("Authorization"));

      c.set(
        "account",
        await authenticateBearerToken(c.get("db"), rawToken, requiredScopes),
      );
      return await next();
    } catch (error) {
      if (!(error instanceof OAuthBearerError)) throw error;

      c.header(
        "WWW-Authenticate",
        error.requiredScope
          ? `Bearer error="insufficient_scope", scope="${error.requiredScope}"`
          : "Bearer",
      );

      return c.json(
        OAuthUserErrorSchema.parse({
          error: error.code,
          message: error.message,
        }),
        error.status,
      );
    }
  };
}

function parseBearerToken(authorization: string | undefined) {
  const match = /^Bearer (ab_at_[A-Za-z0-9_-]{43})$/i.exec(authorization ?? "");
  const token = match?.[1];
  if (!token) throw invalidToken();
  return token;
}

async function authenticateBearerToken(
  db: HonoEnv["Variables"]["db"],
  rawToken: string,
  requiredScopes: readonly OAuthScope[],
) {
  const now = new Date();

  const token = await db
    .selectFrom("oauth_access_token")
    .select(["expires_at", "oauth_grant_id", "revoked_at", "scopes"])
    .where("token_hash", "=", hashOAuthCredential(rawToken))
    .executeTakeFirst();

  if (!token || token.revoked_at != null || token.expires_at <= now) {
    throw invalidToken();
  }

  const grant = await db
    .selectFrom("oauth_grant")
    .select(["account_id", "oauth_client_id"])
    .where("id", "=", token.oauth_grant_id)
    .executeTakeFirst();
  if (!grant) throw invalidToken();

  const client = await db
    .selectFrom("oauth_client")
    .select("disabled_at")
    .where("id", "=", grant.oauth_client_id)
    .executeTakeFirst();
  if (!client || client.disabled_at != null) throw invalidToken();

  const account = await findAccountForAuth(db, grant.account_id);
  if (!account) throw invalidToken();
  if (account.active_account_ban_id != null) {
    throw new OAuthBearerError("account_banned", "Account is banned", 403);
  }

  const scopes = canonicalizeOAuthScopes(token.scopes);
  const scopeSet = new Set<OAuthScope>(scopes);
  const missingScope = requiredScopes.find(
    (requiredScope) => !scopeSet.has(requiredScope),
  );
  if (missingScope) {
    throw new OAuthBearerError(
      "insufficient_scope",
      `This endpoint requires ${missingScope}`,
      403,
      missingScope,
    );
  }

  return account;
}

function invalidToken() {
  return new OAuthBearerError(
    "invalid_token",
    "Access token is missing, invalid, or expired",
    401,
  );
}
