import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { isWellFormedRedirectUri } from "../../lib/oauth/redirect-uri.ts";
import { createOAuthAuthorizationRequest } from "./authorization.ts";
import {
  createOAuthErrorRedirectUrl,
  encodeOAuthError,
  OAuthAuthorizationError,
  OAuthErrorResponseSchema,
} from "./errors.ts";

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

const routes = new OpenAPIHono<HonoEnv>({
  defaultHook: (result, c) => {
    if (result.success) return;

    return c.json(
      OAuthErrorResponseSchema.parse({
        error: "invalid_request",
        error_description: "Authorization request is malformed",
      }),
      400,
    );
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

export default routes;
