import type { Context } from "hono";
import { z } from "zod";
import type { HonoEnv } from "../../hono-env.ts";
import { ArkhamDbRemoteDecksSchema } from "./core/dtos.ts";
import { ApiError } from "./core/errors.ts";
import { baseHeaders, mergeHeaders } from "./core/headers.ts";
import { request } from "./core/request.ts";

export async function exchangeAuthCodeForToken<E extends HonoEnv = HonoEnv>(
  c: Context<E>,
  code: string,
): Promise<OAuthAccessToken> {
  const config = getOAuthConfig(c);

  const response = await request<OAuthAccessToken, E>(
    c,
    `${config.base}/token`,
    {
      method: "POST",
      headers: baseHeaders("POST"),
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    },
  );

  const token = response.data;

  if (!isOAuthAccessToken(token)) {
    throw new ApiError("unknown_error", 500);
  }

  return token;
}

export async function refreshAccessToken<E extends HonoEnv = HonoEnv>(
  c: Context<E>,
  refreshToken: string,
): Promise<OAuthAccessToken> {
  const config = getOAuthConfig(c);

  const response = await request<OAuthAccessToken, E>(
    c,
    `${config.base}/token`,
    {
      method: "POST",
      headers: baseHeaders("POST"),
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "refresh_token",
      }),
    },
  );

  const token = response.data;

  if (!isOAuthAccessToken(token)) {
    throw new ApiError("unknown_error", 500);
  }

  return token;
}

type BearerTokenRequestDependencies<E extends HonoEnv = HonoEnv> = {
  context: Context<E>;
  accessToken: OAuthAccessToken;
};

export async function fetchDecksForOAuthUser(
  auth: BearerTokenRequestDependencies,
) {
  const response = await bearerTokenRequest<unknown>(auth, "/decks");
  return {
    ...response,
    data: ArkhamDbRemoteDecksSchema.parse(response.data),
  };
}

export const OAuthAccessTokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  scope: z.string().nullish(),
  refresh_token: z.string(),
});

export type OAuthAccessToken = z.infer<typeof OAuthAccessTokenSchema>;

export function isOAuthAccessToken(value: unknown): value is OAuthAccessToken {
  return OAuthAccessTokenSchema.safeParse(value).success;
}

function getOAuthConfig<TEnv extends HonoEnv = HonoEnv>(c: Context<TEnv>) {
  const config = c.get("config");

  return {
    base: "/oauth/v2",
    redirectUri: config.ARKHAMDB_OAUTH_REDIRECT_URI,
    clientId: config.ARKHAMDB_OAUTH_CLIENT_ID,
    clientSecret: config.ARKHAMDB_OAUTH_CLIENT_SECRET,
  };
}

function bearerTokenRequest<T, E extends HonoEnv = HonoEnv>(
  { context, accessToken }: BearerTokenRequestDependencies<E>,
  path: string,
  options: RequestInit = {},
) {
  return request<T, E>(context, `/api/oauth2${path}`, {
    ...options,
    headers: mergeHeaders(options.headers, {
      Authorization: `Bearer ${accessToken.access_token}`,
    }),
  });
}
