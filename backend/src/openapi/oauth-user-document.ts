import { z, type ZodType } from "zod";
import {
  OAuthAuthorizationQuerySchema,
  OAuthErrorResponseSchema,
  OAuthRevocationFormSchema,
  OAuthTokenFormSchema,
  OAuthTokenResponseSchema,
} from "../features/oauth/dtos.ts";
import {
  OAuthProfileResponseSchema,
  OAuthUserErrorSchema,
} from "../features/oauth-user/dtos.ts";

const JSON_CONTENT_TYPE = "application/json";
const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded";

export function createOAuthUserOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Arkham Build OAuth and User API",
      version: "1.0.0",
    },
    paths: {
      "/v2/oauth/authorize": {
        get: {
          operationId: "authorizeOAuthClient",
          tags: ["OAuth"],
          summary: "Start an OAuth authorization request",
          parameters: authorizationQueryParameters(),
          responses: {
            302: {
              description:
                "Redirect to consent or the registered client callback",
            },
            400: jsonResponse(
              "OAuthError",
              "OAuth request cannot be safely redirected",
            ),
          },
        },
      },
      "/v2/oauth/token": {
        post: {
          operationId: "exchangeOAuthToken",
          tags: ["OAuth"],
          summary: "Exchange an authorization code or refresh token",
          requestBody: formRequestBody("OAuthTokenForm"),
          responses: {
            200: jsonResponse("OAuthTokenResponse", "OAuth token response"),
            400: jsonResponse(
              "OAuthError",
              "Invalid OAuth token request or grant",
            ),
            401: jsonResponse("OAuthError", "Client authentication failed"),
          },
        },
      },
      "/v2/oauth/revoke": {
        post: {
          operationId: "revokeOAuthToken",
          tags: ["OAuth"],
          summary: "Revoke an OAuth access or refresh token",
          requestBody: formRequestBody("OAuthRevocationForm"),
          responses: {
            200: {
              description: "Token is revoked or was not recognized",
            },
            400: jsonResponse("OAuthError", "Invalid OAuth revocation request"),
            401: jsonResponse("OAuthError", "Client authentication failed"),
          },
        },
      },
      "/v2/user/me": {
        get: {
          operationId: "getOAuthUserProfile",
          tags: ["User"],
          summary: "Get the authenticated user's public profile",
          security: [{ OAuthBearer: [] }],
          responses: {
            200: jsonResponse(
              "OAuthProfileResponse",
              "Authenticated user's public profile",
            ),
            401: jsonResponse(
              "OAuthUserError",
              "Bearer token is missing or unusable",
            ),
            403: jsonResponse(
              "OAuthUserError",
              "Account is banned or the token has insufficient scope",
            ),
          },
        },
      },
    },
    components: {
      schemas: {
        OAuthAuthorizationQuery: jsonSchema(OAuthAuthorizationQuerySchema),
        OAuthError: jsonSchema(OAuthErrorResponseSchema),
        OAuthProfileResponse: jsonSchema(OAuthProfileResponseSchema),
        OAuthRevocationForm: jsonSchema(OAuthRevocationFormSchema),
        OAuthTokenForm: jsonSchema(OAuthTokenFormSchema),
        OAuthTokenResponse: jsonSchema(OAuthTokenResponseSchema),
        OAuthUserError: jsonSchema(OAuthUserErrorSchema),
      },
      securitySchemes: {
        OAuthBearer: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "opaque",
        },
      },
    },
  } as const;
}

function authorizationQueryParameters() {
  return [
    authorizationQueryParameter("response_type"),
    authorizationQueryParameter("client_id"),
    authorizationQueryParameter("redirect_uri"),
    authorizationQueryParameter("scope"),
    authorizationQueryParameter("state"),
  ];
}

function authorizationQueryParameter(name: string) {
  return {
    name,
    in: "query",
    required: false,
    schema: {
      $ref: `#/components/schemas/OAuthAuthorizationQuery/properties/${name}`,
    },
  } as const;
}

function formRequestBody(schemaName: string) {
  return {
    required: true,
    content: {
      [FORM_CONTENT_TYPE]: {
        schema: schemaReference(schemaName),
      },
    },
  };
}

function jsonResponse(schemaName: string, description: string) {
  return {
    description,
    content: {
      [JSON_CONTENT_TYPE]: {
        schema: schemaReference(schemaName),
      },
    },
  };
}

function schemaReference(schemaName: string) {
  return { $ref: `#/components/schemas/${schemaName}` } as const;
}

function jsonSchema(schema: ZodType) {
  return z.toJSONSchema(schema);
}
