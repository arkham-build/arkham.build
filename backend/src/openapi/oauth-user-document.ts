import { z, type ZodType } from "zod";
import {
  OAuthAuthorizationQuerySchema,
  OAuthErrorResponseSchema,
  OAuthRevocationFormSchema,
  OAuthTokenFormSchema,
  OAuthTokenResponseSchema,
} from "../features/oauth/dtos.ts";
import {
  OAuthDeckBatchRequestSchema,
  OAuthDeckBatchResponseSchema,
  OAuthDeckDeleteQuerySchema,
  OAuthDeckManifestQuerySchema,
  OAuthDeckManifestResponseSchema,
  OAuthDeckRouteIdSchema,
  OAuthDeckSchema,
  OAuthDeckSourceSchema,
  OAuthDeckTargetSchema,
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
      "/v2/user/decks/manifest": {
        get: {
          operationId: "getOAuthDeckManifest",
          tags: ["User decks"],
          summary: "Get the user's deck manifest",
          security: [{ OAuthBearer: [] }],
          parameters: [
            queryParameter(
              "source",
              "#/components/schemas/OAuthDeckManifestQuery/properties/source",
            ),
          ],
          responses: {
            200: jsonResponse(
              "OAuthDeckManifestResponse",
              "Source-aware deck manifest",
            ),
            400: jsonResponse("OAuthUserError", "Invalid source filter"),
            401: jsonResponse("OAuthUserError", "Bearer token is unusable"),
            403: jsonResponse("OAuthUserError", "Scope is insufficient"),
          },
        },
      },
      "/v2/user/decks/batch": {
        post: {
          operationId: "getOAuthDeckBatch",
          tags: ["User decks"],
          summary: "Get a batch of decks",
          security: [{ OAuthBearer: [] }],
          requestBody: jsonRequestBody("OAuthDeckBatchRequest"),
          responses: {
            200: jsonResponse("OAuthDeckBatchResponse", "Requested decks"),
            400: jsonResponse("OAuthUserError", "Batch request is invalid"),
            401: jsonResponse("OAuthUserError", "Bearer token is unusable"),
            403: jsonResponse("OAuthUserError", "Scope is insufficient"),
            404: jsonResponse("OAuthUserError", "A deck was not found"),
            503: jsonResponse("OAuthUserError", "ArkhamDB is unavailable"),
          },
        },
      },
      "/v2/user/decks/{source}": {
        post: {
          operationId: "createOAuthDeck",
          tags: ["User decks"],
          summary: "Create a deck",
          security: [{ OAuthBearer: [] }],
          parameters: [deckSourceParameter()],
          requestBody: jsonRequestBody("OAuthDeck"),
          responses: {
            201: jsonResponse("OAuthDeck", "Created deck"),
            400: jsonResponse("OAuthUserError", "Deck input is invalid"),
            401: jsonResponse("OAuthUserError", "Bearer token is unusable"),
            403: jsonResponse("OAuthUserError", "Scope is insufficient"),
            503: jsonResponse("OAuthUserError", "ArkhamDB is unavailable"),
          },
        },
      },
      "/v2/user/decks/{source}/{id}": {
        get: {
          operationId: "getOAuthDeck",
          tags: ["User decks"],
          summary: "Get one deck",
          security: [{ OAuthBearer: [] }],
          parameters: deckTargetParameters(),
          responses: {
            200: jsonResponse("OAuthDeck", "Requested deck"),
            400: jsonResponse("OAuthUserError", "Deck target is invalid"),
            401: jsonResponse("OAuthUserError", "Bearer token is unusable"),
            403: jsonResponse("OAuthUserError", "Scope is insufficient"),
            404: jsonResponse("OAuthUserError", "Deck was not found"),
            503: jsonResponse("OAuthUserError", "ArkhamDB is unavailable"),
          },
        },
        put: {
          operationId: "updateOAuthDeck",
          tags: ["User decks"],
          summary: "Replace a deck",
          security: [{ OAuthBearer: [] }],
          parameters: deckTargetParameters(),
          requestBody: jsonRequestBody("OAuthDeck"),
          responses: {
            200: jsonResponse("OAuthDeck", "Updated deck"),
            400: jsonResponse("OAuthUserError", "Deck input is invalid"),
            401: jsonResponse("OAuthUserError", "Bearer token is unusable"),
            403: jsonResponse("OAuthUserError", "Scope is insufficient"),
            404: jsonResponse("OAuthUserError", "Deck was not found"),
            409: jsonResponse("OAuthUserError", "Deck transition conflicts"),
            503: jsonResponse("OAuthUserError", "ArkhamDB is unavailable"),
          },
        },
        delete: {
          operationId: "deleteOAuthDeck",
          tags: ["User decks"],
          summary: "Delete a deck",
          security: [{ OAuthBearer: [] }],
          parameters: [
            ...deckTargetParameters(),
            queryParameter(
              "all",
              "#/components/schemas/OAuthDeckDeleteQuery/properties/all",
            ),
          ],
          responses: {
            204: { description: "Deck deleted" },
            400: jsonResponse("OAuthUserError", "Deck target is invalid"),
            401: jsonResponse("OAuthUserError", "Bearer token is unusable"),
            403: jsonResponse("OAuthUserError", "Scope is insufficient"),
            404: jsonResponse("OAuthUserError", "Deck was not found"),
            503: jsonResponse("OAuthUserError", "ArkhamDB is unavailable"),
          },
        },
      },
      "/v2/user/decks/{source}/{id}/upgrade": {
        post: {
          operationId: "upgradeOAuthDeck",
          tags: ["User decks"],
          summary: "Upgrade a deck",
          security: [{ OAuthBearer: [] }],
          parameters: deckTargetParameters(),
          requestBody: jsonRequestBody("OAuthDeck"),
          responses: {
            201: jsonResponse("OAuthDeck", "Created upgraded deck"),
            400: jsonResponse("OAuthUserError", "Deck input is invalid"),
            401: jsonResponse("OAuthUserError", "Bearer token is unusable"),
            403: jsonResponse("OAuthUserError", "Scope is insufficient"),
            404: jsonResponse("OAuthUserError", "Deck was not found"),
            409: jsonResponse("OAuthUserError", "Deck already has an upgrade"),
            503: jsonResponse("OAuthUserError", "ArkhamDB is unavailable"),
          },
        },
      },
    },
    components: {
      schemas: {
        OAuthAuthorizationQuery: jsonSchema(OAuthAuthorizationQuerySchema),
        OAuthDeck: jsonSchema(OAuthDeckSchema),
        OAuthDeckBatchRequest: jsonSchema(OAuthDeckBatchRequestSchema),
        OAuthDeckBatchResponse: jsonSchema(OAuthDeckBatchResponseSchema),
        OAuthDeckDeleteQuery: jsonSchema(OAuthDeckDeleteQuerySchema),
        OAuthDeckManifestQuery: jsonSchema(OAuthDeckManifestQuerySchema),
        OAuthDeckManifestResponse: jsonSchema(OAuthDeckManifestResponseSchema),
        OAuthDeckRouteId: jsonSchema(OAuthDeckRouteIdSchema),
        OAuthDeckSource: jsonSchema(OAuthDeckSourceSchema),
        OAuthDeckTarget: jsonSchema(OAuthDeckTargetSchema),
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

function deckTargetParameters() {
  return [deckSourceParameter(), pathParameter("id", "OAuthDeckRouteId")];
}

function deckSourceParameter() {
  return pathParameter("source", "OAuthDeckSource");
}

function pathParameter(name: string, schemaName: string) {
  return {
    name,
    in: "path",
    required: true,
    schema: schemaReference(schemaName),
  } as const;
}

function queryParameter(name: string, schemaPath: string) {
  return {
    name,
    in: "query",
    required: false,
    schema: { $ref: schemaPath },
  } as const;
}

function jsonRequestBody(schemaName: string) {
  return {
    required: true,
    content: {
      [JSON_CONTENT_TYPE]: {
        schema: schemaReference(schemaName),
      },
    },
  };
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
