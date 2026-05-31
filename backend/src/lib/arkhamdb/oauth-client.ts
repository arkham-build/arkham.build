import type { Context } from "hono";
import { type OAuthAccessToken, OAuthFlowError } from "../oauth.ts";
import type {
  ArkhamDBApiError,
  ArkhamDBDeck,
  OAuthErrorResponse,
} from "./types.ts";

function getOAuthConfig(c: Context) {
  const config = c.get("config");

  return {
    base: `${config.ARKHAMDB_BASE_URL}/oauth/v2`,
    redirectUri: config.ARKHAMDB_OAUTH_REDIRECT_URI,
    clientId: config.ARKHAMDB_OAUTH_CLIENT_ID,
    clientSecret: config.ARKHAMDB_OAUTH_CLIENT_SECRET,
  };
}

function isOAuthErrorResponse(value: unknown): value is OAuthErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    "error_description" in value
  );
}

function isArkhamDBApiError(value: unknown): value is ArkhamDBApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value
  );
}

function isOAuthAccessToken(value: unknown): value is OAuthAccessToken {
  return (
    typeof value === "object" &&
    value !== null &&
    "access_token" in value &&
    "expires_in" in value &&
    "token_type" in value &&
    "refresh_token" in value
  );
}

async function parseErrorCode(response: Response) {
  try {
    const body = (await response.json()) as unknown;

    if (isOAuthErrorResponse(body)) {
      return body.error;
    }

    if (isArkhamDBApiError(body)) {
      return body.message;
    }
  } catch {}

  return "unknown_error";
}

async function assertSuccessful(response: Response) {
  if (!response.ok) {
    throw new OAuthFlowError(await parseErrorCode(response));
  }
}

function baseHeaders() {
  return {
    Accept: "application/json",
    "User-Agent": "api.arkham.build (https://arkham.build)",
  };
}

export async function exchangeAuthCodeForToken(
  c: Context,
  code: string,
): Promise<OAuthAccessToken> {
  const config = getOAuthConfig(c);
  const response = await fetch(`${config.base}/token`, {
    method: "POST",
    headers: {
      ...baseHeaders(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  await assertSuccessful(response);

  const token = (await response.json()) as unknown;

  if (!isOAuthAccessToken(token)) {
    throw new OAuthFlowError("invalid_token");
  }

  return token;
}

export async function refreshAccessToken(
  c: Context,
  refreshToken: string,
): Promise<OAuthAccessToken> {
  const config = getOAuthConfig(c);
  const response = await fetch(`${config.base}/token`, {
    method: "POST",
    headers: {
      ...baseHeaders(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  await assertSuccessful(response);

  const token = (await response.json()) as unknown;

  if (!isOAuthAccessToken(token)) {
    throw new OAuthFlowError("invalid_token");
  }

  return token;
}

export async function fetchUserDecksForAccessToken(
  c: Context,
  accessToken: string,
): Promise<ArkhamDBDeck[]> {
  const config = c.get("config");
  const response = await fetch(`${config.ARKHAMDB_BASE_URL}/api/oauth2/decks`, {
    headers: {
      ...baseHeaders(),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await assertSuccessful(response);

  const decks = (await response.json()) as unknown;

  if (!Array.isArray(decks)) {
    throw new OAuthFlowError("arkhamdb_invalid_response");
  }

  return decks as ArkhamDBDeck[];
}
