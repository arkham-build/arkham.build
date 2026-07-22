import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { isWellFormedRedirectUri } from "../../lib/oauth/redirect-uri.ts";
import { createOAuthAuthorizationRequest } from "./authorization.ts";
import {
  createOAuthErrorRedirectUrl,
  encodeOAuthError,
  OAuthAuthorizationError,
  OAuthErrorResponseSchema,
  OAuthTokenError,
} from "./errors.ts";
import {
  exchangeOAuthAuthorizationCode,
  exchangeOAuthRefreshToken,
} from "./token-exchange.ts";

const routes = new OpenAPIHono<HonoEnv>({
  defaultHook: (result, c) => {
    if (result.success) return;

    return c.json(
      OAuthErrorResponseSchema.parse({
        error: "invalid_request",
        error_description: c.req.path.endsWith("/token")
          ? "Token request is malformed"
          : "Authorization request is malformed",
      }),
      400,
    );
  },
});

/**
 * GET /authorize
 */

const AuthorizationQuerySchema = z
  .object({
    response_type: z.string().optional().openapi({ example: "code" }),
    client_id: z.string().optional().openapi({
      example: "019c1234-5678-7000-8000-000000000000",
    }),
    redirect_uri: z.string().optional().openapi({
      example: "https://example.com/oauth/callback",
    }),
    scope: z.string().optional().openapi({
      example: "profile:read decks:read",
    }),
    state: z.string().optional().openapi({ example: "opaque-client-state" }),
  })
  .openapi("OAuthAuthorizationQuery");

const AuthorizeRoute = createRoute({
  method: "get",
  path: "/authorize",
  operationId: "authorizeOAuthClient",
  tags: ["OAuth"],
  summary: "Start an OAuth authorization request",
  request: {
    query: AuthorizationQuerySchema,
  },
  responses: {
    302: {
      description: "Redirect to consent or the registered client callback",
    },
    400: {
      content: {
        "application/json": {
          schema: OAuthErrorResponseSchema,
        },
      },
      description: "OAuth request cannot be safely redirected",
    },
  },
});

routes.openapi(AuthorizeRoute, async (c) => {
  try {
    const query = c.req.valid("query");
    const clientId = z.uuid().safeParse(query.client_id);
    if (!clientId.success) {
      throw new OAuthAuthorizationError("invalid_request", "Client is invalid");
    }

    if (!isWellFormedRedirectUri(query.redirect_uri)) {
      throw new OAuthAuthorizationError(
        "invalid_request",
        "Redirect URI is invalid",
      );
    }

    const authorizationRequest = await createOAuthAuthorizationRequest(
      c.get("db"),
      {
        clientId: clientId.data,
        redirectUri: query.redirect_uri,
        responseType: query.response_type,
        scope: query.scope,
        state: query.state,
      },
    );

    const consentUrl = new URL("/oauth/consent", c.get("config").FRONTEND_URL);
    consentUrl.searchParams.set("request", authorizationRequest.requestToken);

    return c.redirect(consentUrl.toString(), 302);
  } catch (error) {
    if (!(error instanceof OAuthAuthorizationError)) throw error;

    if (error.redirect) {
      return c.redirect(
        createOAuthErrorRedirectUrl(error.redirect, error),
        302,
      );
    }

    return c.json(encodeOAuthError(error), 400);
  }
});

/**
 * POST /token
 */

const OAuthTokenFormSchema = z
  .object({
    grant_type: z.string().optional().openapi({
      example: "authorization_code",
    }),
    client_id: z.string().optional().openapi({
      example: "019c1234-5678-7000-8000-000000000000",
    }),
    client_secret: z.string().optional().openapi({ example: "ab_cs_..." }),
    code: z.string().optional().openapi({ example: "ab_code_..." }),
    redirect_uri: z.string().optional().openapi({
      example: "https://example.com/oauth/callback",
    }),
    refresh_token: z.string().optional().openapi({ example: "ab_rt_..." }),
    scope: z.string().optional(),
  })
  .strict()
  .openapi("OAuthTokenForm");

const OAuthTokenResponseSchema = z
  .object({
    token_type: z.literal("Bearer"),
    access_token: z.string().startsWith("ab_at_"),
    expires_in: z.literal(3600),
    refresh_token: z.string().startsWith("ab_rt_"),
    scope: z.string(),
  })
  .strict()
  .openapi("OAuthTokenResponse");

const OAuthGrantTypeSchema = z.enum(["authorization_code", "refresh_token"]);

const OAuthClientCredentialsSchema = z.object({
  client_id: z.uuid(),
  client_secret: z.string().min(1),
});

const OAuthAuthorizationCodeExchangeFormSchema =
  OAuthClientCredentialsSchema.extend({
    grant_type: z.literal("authorization_code"),
    code: z.string().min(1),
    redirect_uri: z.string().min(1),
  })
    .strict()
    .transform((input) => ({
      grantType: input.grant_type,
      clientId: input.client_id,
      clientSecret: input.client_secret,
      code: input.code,
      redirectUri: input.redirect_uri,
    }));

const OAuthRefreshTokenExchangeFormSchema = OAuthClientCredentialsSchema.extend(
  {
    grant_type: z.literal("refresh_token"),
    refresh_token: z.string().min(1),
  },
)
  .strict()
  .transform((input) => ({
    grantType: input.grant_type,
    clientId: input.client_id,
    clientSecret: input.client_secret,
    refreshToken: input.refresh_token,
  }));

const TokenRoute = createRoute({
  method: "post",
  path: "/token",
  operationId: "exchangeOAuthToken",
  tags: ["OAuth"],
  summary: "Exchange an authorization code or refresh token",
  request: {
    body: {
      required: true,
      content: {
        "application/x-www-form-urlencoded": {
          schema: OAuthTokenFormSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: OAuthTokenResponseSchema,
        },
      },
      description: "OAuth token response",
    },
    400: {
      content: {
        "application/json": {
          schema: OAuthErrorResponseSchema,
        },
      },
      description: "Invalid OAuth token request or grant",
    },
    401: {
      content: {
        "application/json": {
          schema: OAuthErrorResponseSchema,
        },
      },
      description: "Client authentication failed",
    },
  },
});

routes.openapi(TokenRoute, async (c) => {
  try {
    if (!isFormUrlEncoded(c.req.header("Content-Type"))) {
      throw malformedTokenRequest();
    }

    if (c.req.header("Authorization") !== undefined) {
      throw new OAuthTokenError(
        "invalid_client",
        "Client credentials must be sent in the request body",
        401,
      );
    }

    const input = parseOAuthTokenForm(c.req.valid("form"));

    const token =
      input.grantType === "authorization_code"
        ? await exchangeOAuthAuthorizationCode(c.get("db"), input)
        : await exchangeOAuthRefreshToken(c.get("db"), input);

    c.header("Cache-Control", "no-store");
    c.header("Pragma", "no-cache");

    return c.json(
      OAuthTokenResponseSchema.parse({
        token_type: "Bearer",
        access_token: token.accessToken,
        expires_in: token.expiresIn,
        refresh_token: token.refreshToken,
        scope: token.scopes.join(" "),
      }),
      200,
    );
  } catch (error) {
    if (!(error instanceof OAuthTokenError)) throw error;
    return c.json(encodeOAuthError(error), error.status);
  }
});

function parseOAuthTokenForm(input: z.infer<typeof OAuthTokenFormSchema>) {
  const grantType = z.string().min(1).safeParse(input.grant_type);
  if (!grantType.success) throw malformedTokenRequest();

  const supportedGrantType = OAuthGrantTypeSchema.safeParse(grantType.data);
  if (!supportedGrantType.success) {
    throw new OAuthTokenError(
      "unsupported_grant_type",
      "Grant type is not supported",
    );
  }

  if (input.scope !== undefined) {
    throw new OAuthTokenError(
      "invalid_scope",
      "Scope changes are not permitted",
    );
  }

  if (!OAuthClientCredentialsSchema.safeParse(input).success) {
    throw new OAuthTokenError(
      "invalid_client",
      "Client authentication failed",
      401,
    );
  }

  const result =
    supportedGrantType.data === "authorization_code"
      ? OAuthAuthorizationCodeExchangeFormSchema.safeParse(input)
      : OAuthRefreshTokenExchangeFormSchema.safeParse(input);

  if (!result.success) throw malformedTokenRequest();
  return result.data;
}

function malformedTokenRequest() {
  return new OAuthTokenError("invalid_request", "Token request is malformed");
}

function isFormUrlEncoded(contentType: string | undefined) {
  return (
    contentType?.split(";", 1)[0]?.trim().toLowerCase() ===
    "application/x-www-form-urlencoded"
  );
}

export default routes;
