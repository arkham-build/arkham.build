import { Hono, type MiddlewareHandler } from "hono";
import { z, ZodType } from "zod";
import type { HonoEnv } from "../../../lib/hono-env.ts";
import { isWellFormedRedirectUri } from "../../../lib/oauth/redirect-uri.ts";
import {
  OAuthAuthorizationQuerySchema,
  OAuthErrorResponseSchema,
  OAuthRevocationFormSchema,
  OAuthTokenFormSchema,
  OAuthTokenResponseSchema,
} from "../dtos.ts";
import { createOAuthAuthorizationRequest } from "../lib/authorization.ts";
import {
  createOAuthErrorRedirectUrl,
  encodeOAuthError,
  OAuthAuthorizationError,
  OAuthTokenError,
} from "../lib/errors.ts";
import { revokeOAuthToken } from "../lib/revocation.ts";
import {
  exchangeOAuthAuthorizationCode,
  exchangeOAuthRefreshToken,
} from "../lib/token-exchange.ts";
import { validator } from "hono/validator";

const routes = new Hono<HonoEnv>();

routes.get(
  "/authorize",
  oauthQueryValidator(
    OAuthAuthorizationQuerySchema,
    "Authorization request is malformed",
  ),
  async (c) => {
    try {
      const query = c.req.valid("query");
      const clientId = z.uuid().safeParse(query.client_id);
      if (!clientId.success) {
        throw new OAuthAuthorizationError(
          "invalid_request",
          "Client is invalid",
        );
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

      const consentUrl = new URL(
        "/oauth/consent",
        c.get("config").FRONTEND_URL,
      );
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
  },
);

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

routes.post(
  "/token",
  oauthFormRequestMiddleware(malformedTokenRequest),
  oauthFormValidator(OAuthTokenFormSchema, "Token request is malformed"),
  async (c) => {
    try {
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
  },
);

const OAuthRevocationInputSchema = OAuthClientCredentialsSchema.extend({
  token: z.string().min(1),
  token_type_hint: z.string().min(1).max(64).optional(),
})
  .strict()
  .transform((input) => ({
    clientId: input.client_id,
    clientSecret: input.client_secret,
    token: input.token,
  }));

routes.use("/revoke", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("Pragma", "no-cache");
  await next();
});

routes.post(
  "/revoke",
  oauthFormRequestMiddleware(malformedRevocationRequest),
  oauthFormValidator(
    OAuthRevocationFormSchema,
    "Revocation request is malformed",
  ),
  async (c) => {
    try {
      const input = parseOAuthRevocationForm(c.req.valid("form"));
      await revokeOAuthToken(c.get("db"), input);
      return c.body(null, 200);
    } catch (error) {
      if (!(error instanceof OAuthTokenError)) throw error;
      return c.json(encodeOAuthError(error), error.status);
    }
  },
);

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

function parseOAuthRevocationForm(
  input: z.infer<typeof OAuthRevocationFormSchema>,
) {
  if (!OAuthClientCredentialsSchema.safeParse(input).success) {
    throw new OAuthTokenError(
      "invalid_client",
      "Client authentication failed",
      401,
    );
  }

  const result = OAuthRevocationInputSchema.safeParse(input);
  if (!result.success) throw malformedRevocationRequest();
  return result.data;
}

function malformedTokenRequest() {
  return new OAuthTokenError("invalid_request", "Token request is malformed");
}

function malformedRevocationRequest() {
  return new OAuthTokenError(
    "invalid_request",
    "Revocation request is malformed",
  );
}

function oauthFormRequestMiddleware(
  malformedRequest: () => OAuthTokenError,
): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    if (!isFormUrlEncoded(c.req.header("Content-Type"))) {
      const error = malformedRequest();
      return c.json(encodeOAuthError(error), error.status);
    }

    if (c.req.header("Authorization") !== undefined) {
      const error = new OAuthTokenError(
        "invalid_client",
        "Client credentials must be sent in the request body",
        401,
      );
      return c.json(encodeOAuthError(error), error.status);
    }

    return await next();
  };
}

export function oauthQueryValidator<T>(
  schema: ZodType<T>,
  errorDescription: string,
) {
  return validator("query", (value, c) => {
    const result = schema.safeParse(value);
    if (result.success) return result.data;

    return c.json(
      OAuthErrorResponseSchema.parse({
        error: "invalid_request",
        error_description: errorDescription,
      }),
      400,
    );
  });
}

function oauthFormValidator<T>(schema: ZodType<T>, errorDescription: string) {
  return validator("form", (value, c) => {
    const result = schema.safeParse(value);
    if (result.success) return result.data;

    return c.json(
      OAuthErrorResponseSchema.parse({
        error: "invalid_request",
        error_description: errorDescription,
      }),
      400,
    );
  });
}

function isFormUrlEncoded(contentType: string | undefined) {
  return (
    contentType?.split(";", 1)[0]?.trim().toLowerCase() ===
    "application/x-www-form-urlencoded"
  );
}

export default routes;
