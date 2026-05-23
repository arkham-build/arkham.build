import { randomBytes } from "node:crypto";
import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { z } from "zod";
import { request } from "../../lib/arkhamdb/shared.ts";
import type {
  AccessToken,
  ArkhamDBDeck,
  OAuthErrorCode,
  OAuthErrorResponse,
} from "../../lib/arkhamdb/types.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";

export class OAuthError extends Error {
  code: OAuthErrorCode;

  constructor(code: OAuthErrorCode = "unknown_error", cause?: Error) {
    super(code);
    this.name = "AuthError";
    this.code = code;
    if (cause) {
      this.cause = cause;
      if (cause.stack) {
        this.stack = cause?.stack;
      }
    }
  }
}

export class NotChangedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotChangedError";
  }
}

export const OAuthIntentSchema = z.enum(["login", "signup", "connect"]);

export const OAuthContextSchema = z.object({
  accountId: z.string().optional(),
  intent: OAuthIntentSchema,
  returnTo: z.string(),
});

const OAuthStateCookieSchema = OAuthContextSchema.extend({
  state: z.string(),
});

export type OAuthIntent = z.infer<typeof OAuthIntentSchema>;
export type OAuthContext = z.infer<typeof OAuthContextSchema>;
type OAuthStateCookie = z.infer<typeof OAuthStateCookieSchema>;

const OAUTH_STATE_COOKIE_NAME = "arkham-build-oauth-state";
const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

function isOAuthErrorResponse(x: unknown): x is OAuthErrorResponse {
  return (
    typeof x === "object" &&
    x !== null &&
    "error" in x &&
    "error_description" in x
  );
}

function isAccessToken(x: unknown): x is AccessToken {
  return (
    typeof x === "object" &&
    x !== null &&
    "access_token" in x &&
    "expires_in" in x &&
    "token_type" in x &&
    "refresh_token" in x
  );
}

function oauthConfigFromEnv<T extends HonoEnv>(ctx: Context<T>) {
  const config = ctx.var.config;

  return {
    base: `${config.ARKHAMDB_BASE_URL}/oauth/v2`,
    clientId: config.ARKHAMDB_OAUTH_CLIENT_ID,
    clientSecret: config.ARKHAMDB_OAUTH_CLIENT_SECRET,
    redirectUri: config.ARKHAMDB_OAUTH_REDIRECT_URI,
  };
}

async function handleErrorResponse(res: Response) {
  if (res.status >= 400) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new OAuthError("unknown_error");
    }

    if (isOAuthErrorResponse(body)) {
      console.error("[oauth error]", body);
      throw new OAuthError(body.error);
    }

    throw new OAuthError("unknown_error");
  }
}

export async function exchangeAuthCodeForToken(
  ctx: Context<HonoEnv>,
  code: string,
): Promise<AccessToken> {
  const config = oauthConfigFromEnv(ctx);

  const requestPayload = {
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  };

  const res = await fetch(`${config.base}/token`, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    body: new URLSearchParams(requestPayload),
  });

  await handleErrorResponse(res);

  const token = (await res.json()) as AccessToken;

  if (!isAccessToken(token)) {
    console.error("OAuth token validation failed", {
      receivedFields:
        typeof token === "object" && token !== null
          ? Object.keys(token)
          : undefined,
      expectedFields: [
        "access_token",
        "expires_in",
        "token_type",
        "refresh_token",
      ],
    });
    throw new OAuthError("invalid_token");
  }

  return token;
}

export async function refreshToken(
  ctx: Context<HonoEnv>,
  refreshToken: string,
): Promise<AccessToken> {
  const config = oauthConfigFromEnv(ctx);

  const requestPayload = {
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
  };

  const res = await fetch(`${config.base}/token`, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(requestPayload),
    method: "POST",
  });

  await handleErrorResponse(res);

  const refreshed = (await res.json()) as AccessToken;

  if (!isAccessToken(refreshed)) {
    throw new OAuthError("invalid_token");
  }

  return refreshed;
}

export async function authorize<T extends HonoEnv>(
  ctx: Context<T>,
  oauthContext: OAuthContext,
) {
  const config = oauthConfigFromEnv(ctx);
  const state = generateOAuthState();
  const url = new URL(`${config.base}/auth`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  await setSignedCookie(
    ctx,
    OAUTH_STATE_COOKIE_NAME,
    JSON.stringify({
      ...oauthContext,
      state,
    }),
    ctx.var.config.SESSION_SECRET,
    {
      httpOnly: true,
      maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
      path: oauthStateCookiePath(ctx),
      sameSite: "Lax",
      secure: ctx.var.config.NODE_ENV === "production",
    },
  );

  return ctx.redirect(url.toString());
}

export async function getOAuthContext<T extends HonoEnv>(
  ctx: Context<T>,
): Promise<OAuthContext | null> {
  try {
    const oauthState = await getOAuthStateCookie(ctx);

    if (!oauthState) {
      return null;
    }

    return oauthState.accountId
      ? {
          accountId: oauthState.accountId,
          intent: oauthState.intent,
          returnTo: oauthState.returnTo,
        }
      : {
          intent: oauthState.intent,
          returnTo: oauthState.returnTo,
        };
  } catch {
    return null;
  }
}

export async function validateOAuthState<T extends HonoEnv>(
  ctx: Context<T>,
  state: string | undefined,
): Promise<OAuthContext> {
  const oauthState = await getOAuthStateCookie(ctx);
  deleteOAuthStateCookie(ctx);

  if (!state || !oauthState) {
    throw new OAuthError("invalid_state");
  }

  if (oauthState.state !== state) {
    throw new OAuthError("invalid_state");
  }

  return oauthState.accountId
    ? {
        accountId: oauthState.accountId,
        intent: oauthState.intent,
        returnTo: oauthState.returnTo,
      }
    : {
        intent: oauthState.intent,
        returnTo: oauthState.returnTo,
      };
}

export async function fetchUserDecksForOAuth(
  ctx: Context<HonoEnv>,
  accessToken: string,
): Promise<ArkhamDBDeck[]> {
  const res = await request<ArkhamDBDeck[]>(ctx, "/api/oauth2/decks", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!Array.isArray(res.data)) {
    throw new OAuthError("invalid_response");
  }

  return res.data;
}

function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

async function getOAuthStateCookie<T extends HonoEnv>(
  ctx: Context<T>,
): Promise<OAuthStateCookie | null> {
  const signedState = await getSignedCookie(
    ctx,
    ctx.var.config.SESSION_SECRET,
    OAUTH_STATE_COOKIE_NAME,
  );

  if (typeof signedState !== "string") {
    return null;
  }

  return parseOAuthStateCookie(signedState);
}

function parseOAuthStateCookie(signedState: string): OAuthStateCookie {
  try {
    return OAuthStateCookieSchema.parse(JSON.parse(signedState));
  } catch {
    throw new OAuthError("invalid_state");
  }
}

function deleteOAuthStateCookie<T extends HonoEnv>(ctx: Context<T>): void {
  deleteCookie(ctx, OAUTH_STATE_COOKIE_NAME, {
    path: oauthStateCookiePath(ctx),
  });
}

function oauthStateCookiePath<T extends HonoEnv>(ctx: Context<T>): string {
  return new URL(oauthConfigFromEnv(ctx).redirectUri).pathname;
}
