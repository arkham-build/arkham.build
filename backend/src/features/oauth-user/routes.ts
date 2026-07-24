import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { oauthErrorResponse } from "../oauth/lib/errors.ts";
import { oauthBearerAuth, OAuthUserErrorSchema } from "./bearer-auth.ts";

const routes = new OpenAPIHono<HonoEnv>();

routes.openAPIRegistry.registerComponent("securitySchemes", "OAuthBearer", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "opaque",
});

export const OAuthProfileResponseSchema = z
  .object({
    id: z.uuid(),
    username: z.string(),
  })
  .strict()
  .openapi("OAuthProfileResponse");

const ProfileRoute = createRoute({
  method: "get",
  path: "/me",
  operationId: "getOAuthUserProfile",
  tags: ["User"],
  summary: "Get the authenticated user's public profile",
  middleware: [oauthBearerAuth(["profile:read"])] as const,
  security: [{ OAuthBearer: [] }],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: OAuthProfileResponseSchema,
        },
      },
      description: "Authenticated user's public profile",
    },
    401: oauthErrorResponse(
      OAuthUserErrorSchema,
      "Bearer token is missing or unusable",
    ),
    403: oauthErrorResponse(
      OAuthUserErrorSchema,
      "Account is banned or the token has insufficient scope",
    ),
  },
});

routes.openapi(ProfileRoute, (c) => {
  const { account } = c.get("oauthBearer");
  return c.json(
    OAuthProfileResponseSchema.parse({
      id: account.id,
      username: account.name,
    }),
    200,
  );
});

export default routes;
