import { OAuthScopeSchema } from "@arkham-build/shared";
import { z, type ZodType } from "zod";
import {
  OAuthAuthorizationCodeTokenRequestSchema,
  OAuthAuthorizationQuerySchema,
  OAuthErrorResponseSchema,
  OAuthRefreshTokenRequestSchema,
  OAuthRevocationRequestSchema,
  OAuthTokenResponseSchema,
} from "../features/oauth/dtos.ts";
import {
  OAuthDeckBatchRequestSchema,
  OAuthDeckBatchResponseSchema,
  OAuthDeckDeleteQuerySchema,
  OAuthDeckManifestItemSchema,
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
const INTEGRATION_GUIDE_URL =
  "https://github.com/arkham-build/arkham.build/blob/main/docs/oauth-integration.md";

export function createOAuthUserOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Arkham Build OAuth and User API",
      version: "1.0.0",
      description:
        "OAuth 2.0 authorization-code API for confidential server-side clients. " +
        "Client credentials are accepted only in form bodies. Native apps must " +
        "forward authorization codes to a confidential backend; direct token " +
        "exchange from an installed app is unsupported.",
    },
    externalDocs: {
      description: "Confidential-client integration guide",
      url: INTEGRATION_GUIDE_URL,
    },
    servers: [{ url: "https://api.arkham.build" }],
    tags: [
      {
        name: "OAuth",
        description: "Authorization, token exchange, and token revocation",
      },
      {
        name: "User",
        description: "Bearer-authenticated account profile",
      },
      {
        name: "User decks",
        description:
          "Bearer-authenticated account and ArkhamDB deck operations",
      },
    ],
    paths: {
      "/v2/oauth/authorize": {
        get: {
          operationId: "authorizeOAuthClient",
          tags: ["OAuth"],
          summary: "Start an OAuth authorization request",
          description:
            "Starts an authorization-code flow. Every request is sent through " +
            "authentication and explicit user consent, including requests for " +
            "an existing grant. Redirect URI matching is exact.",
          parameters: authorizationQueryParameters(),
          responses: {
            302: redirectResponse(),
            400: jsonResponse(
              "OAuthError",
              "OAuth request cannot be safely redirected because the client or redirect URI is untrusted",
            ),
          },
        },
      },
      "/v2/oauth/token": {
        post: {
          operationId: "exchangeOAuthToken",
          tags: ["OAuth"],
          summary: "Exchange an authorization code or refresh token",
          description:
            "Authenticates a confidential client with client_id and " +
            "client_secret in the form body. HTTP Basic authentication is not " +
            "accepted. Refresh exchanges rotate the submitted token and do not " +
            "permit scope changes.",
          requestBody: tokenFormRequestBody(),
          responses: {
            200: jsonResponse(
              "OAuthTokenResponse",
              "One-hour access token and rotating 90-day refresh token",
              noStoreHeaders(),
            ),
            400: jsonResponse(
              "OAuthError",
              "Invalid OAuth token request, grant, scope, or grant type",
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
          description:
            "Authenticates the confidential client with form-body credentials. " +
            "Unknown tokens and tokens owned by another client return success. " +
            "Revoking a refresh token also revokes access tokens issued from it.",
          requestBody: formRequestBody("OAuthRevocationRequest"),
          responses: {
            200: emptyResponse(
              "Token is revoked or was not recognized",
              noStoreHeaders(),
            ),
            400: jsonResponse(
              "OAuthError",
              "Invalid OAuth revocation request",
              noStoreHeaders(),
            ),
            401: jsonResponse(
              "OAuthError",
              "Client authentication failed",
              noStoreHeaders(),
            ),
          },
        },
      },
      "/v2/user/me": {
        get: {
          operationId: "getOAuthUserProfile",
          tags: ["User"],
          summary: "Get the authenticated user's public profile",
          description:
            "Requires profile:read. Email and identities are omitted.",
          security: oauthSecurity("profile:read"),
          responses: {
            200: jsonResponse(
              "OAuthProfileResponse",
              "Authenticated user's public profile",
            ),
            401: bearerErrorResponse(
              "Bearer token is missing, malformed, expired, revoked, or otherwise unusable",
            ),
            403: bearerForbiddenResponse(
              "Account is banned or the token lacks profile:read",
            ),
          },
        },
      },
      "/v2/user/decks/manifest": {
        get: {
          operationId: "getOAuthDeckManifest",
          tags: ["User decks"],
          summary: "Get the user's deck manifest",
          description:
            "Requires decks:read. Without a source filter, ArkhamDB failure " +
            "produces a partial 200 response with account decks and " +
            "providers.arkhamdb.available=false.",
          security: oauthSecurity("decks:read"),
          parameters: [
            queryParameter(
              "source",
              "#/components/schemas/OAuthDeckManifestQuery/properties/source",
              "Optionally include only one provider",
            ),
          ],
          responses: {
            200: jsonResponse(
              "OAuthDeckManifestResponse",
              "Source-aware deck manifest, possibly partial when ArkhamDB is unavailable",
            ),
            400: jsonResponse("OAuthUserError", "Invalid source filter"),
            401: bearerErrorResponse("Bearer token is unusable"),
            403: bearerForbiddenResponse("Token lacks decks:read"),
          },
        },
      },
      "/v2/user/decks/batch": {
        post: {
          operationId: "getOAuthDeckBatch",
          tags: ["User decks"],
          summary: "Get a batch of decks",
          description:
            "Requires decks:read. Accepts at most 250 provider-specific " +
            "targets, preserves request order, and fails the whole request if " +
            "any target is missing or unavailable.",
          security: oauthSecurity("decks:read"),
          requestBody: jsonRequestBody("OAuthDeckBatchRequest"),
          responses: {
            200: jsonResponse("OAuthDeckBatchResponse", "Requested decks"),
            400: jsonResponse("OAuthUserError", "Batch request is invalid"),
            401: bearerErrorResponse("Bearer token is unusable"),
            403: bearerForbiddenResponse("Token lacks decks:read"),
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
          description:
            "Requires decks:write. Server-owned deck fields in the request are " +
            "ignored. Account creates generate a UUID; ArkhamDB chooses its ID.",
          security: oauthSecurity("decks:write"),
          parameters: [deckSourceParameter()],
          requestBody: jsonRequestBody("OAuthDeck"),
          responses: {
            201: jsonResponse("OAuthDeck", "Created deck"),
            400: jsonResponse("OAuthUserError", "Deck input is invalid"),
            401: bearerErrorResponse("Bearer token is unusable"),
            403: bearerForbiddenResponse("Token lacks decks:write"),
            503: jsonResponse("OAuthUserError", "ArkhamDB is unavailable"),
          },
        },
      },
      "/v2/user/decks/{source}/{id}": {
        get: {
          operationId: "getOAuthDeck",
          tags: ["User decks"],
          summary: "Get one deck",
          description: "Requires decks:read.",
          security: oauthSecurity("decks:read"),
          parameters: deckTargetParameters(),
          responses: {
            200: jsonResponse("OAuthDeck", "Requested deck"),
            400: jsonResponse("OAuthUserError", "Deck target is invalid"),
            401: bearerErrorResponse("Bearer token is unusable"),
            403: bearerForbiddenResponse("Token lacks decks:read"),
            404: jsonResponse("OAuthUserError", "Deck was not found"),
            503: jsonResponse("OAuthUserError", "ArkhamDB is unavailable"),
          },
        },
        put: {
          operationId: "updateOAuthDeck",
          tags: ["User decks"],
          summary: "Replace a deck",
          description:
            "Requires decks:write. Fully replaces mutable content while " +
            "preserving server-owned fields and history links.",
          security: oauthSecurity("decks:write"),
          parameters: deckTargetParameters(),
          requestBody: jsonRequestBody("OAuthDeck"),
          responses: {
            200: jsonResponse("OAuthDeck", "Updated deck"),
            400: jsonResponse("OAuthUserError", "Deck input is invalid"),
            401: bearerErrorResponse("Bearer token is unusable"),
            403: bearerForbiddenResponse("Token lacks decks:write"),
            404: jsonResponse("OAuthUserError", "Deck was not found"),
            409: jsonResponse("OAuthUserError", "Deck transition conflicts"),
            503: jsonResponse("OAuthUserError", "ArkhamDB is unavailable"),
          },
        },
        delete: {
          operationId: "deleteOAuthDeck",
          tags: ["User decks"],
          summary: "Delete a deck",
          description:
            "Requires decks:delete. Set all=true to delete the selected deck " +
            "and its previous history chain.",
          security: oauthSecurity("decks:delete"),
          parameters: [
            ...deckTargetParameters(),
            queryParameter(
              "all",
              "#/components/schemas/OAuthDeckDeleteQuery/properties/all",
              "Delete the selected deck's previous history chain",
            ),
          ],
          responses: {
            204: emptyResponse("Deck deleted"),
            400: jsonResponse("OAuthUserError", "Deck target is invalid"),
            401: bearerErrorResponse("Bearer token is unusable"),
            403: bearerForbiddenResponse("Token lacks decks:delete"),
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
          description:
            "Requires decks:write. Creates a child deck and links it to the " +
            "selected parent using provider-specific history semantics.",
          security: oauthSecurity("decks:write"),
          parameters: deckTargetParameters(),
          requestBody: jsonRequestBody("OAuthDeck"),
          responses: {
            201: jsonResponse("OAuthDeck", "Created upgraded deck"),
            400: jsonResponse("OAuthUserError", "Deck input is invalid"),
            401: bearerErrorResponse("Bearer token is unusable"),
            403: bearerForbiddenResponse("Token lacks decks:write"),
            404: jsonResponse("OAuthUserError", "Deck was not found"),
            409: jsonResponse("OAuthUserError", "Deck already has an upgrade"),
            503: jsonResponse("OAuthUserError", "ArkhamDB is unavailable"),
          },
        },
      },
    },
    components: {
      schemas: {
        OAuthAuthorizationCodeTokenRequest: jsonSchema(
          OAuthAuthorizationCodeTokenRequestSchema,
        ),
        OAuthAuthorizationQuery: jsonSchema(OAuthAuthorizationQuerySchema),
        OAuthDeck: jsonSchema(OAuthDeckSchema),
        OAuthDeckBatchRequest: jsonSchema(OAuthDeckBatchRequestSchema),
        OAuthDeckBatchResponse: jsonSchema(OAuthDeckBatchResponseSchema),
        OAuthDeckDeleteQuery: jsonSchema(OAuthDeckDeleteQuerySchema),
        OAuthDeckManifestItem: jsonSchema(OAuthDeckManifestItemSchema),
        OAuthDeckManifestQuery: jsonSchema(OAuthDeckManifestQuerySchema),
        OAuthDeckManifestResponse: jsonSchema(OAuthDeckManifestResponseSchema),
        OAuthDeckRouteId: jsonSchema(OAuthDeckRouteIdSchema),
        OAuthDeckSource: jsonSchema(OAuthDeckSourceSchema),
        OAuthDeckTarget: jsonSchema(OAuthDeckTargetSchema),
        OAuthError: jsonSchema(OAuthErrorResponseSchema),
        OAuthProfileResponse: jsonSchema(OAuthProfileResponseSchema),
        OAuthRefreshTokenRequest: jsonSchema(OAuthRefreshTokenRequestSchema),
        OAuthRevocationRequest: jsonSchema(OAuthRevocationRequestSchema),
        OAuthScope: jsonSchema(OAuthScopeSchema),
        OAuthTokenResponse: jsonSchema(OAuthTokenResponseSchema),
        OAuthUserError: jsonSchema(OAuthUserErrorSchema),
      },
      securitySchemes: {
        OAuthBearer: {
          type: "oauth2",
          description:
            "Opaque access token sent as Authorization: Bearer ab_at_.... " +
            "Tokens are issued only to confidential server-side clients.",
          flows: {
            authorizationCode: {
              authorizationUrl: "https://api.arkham.build/v2/oauth/authorize",
              tokenUrl: "https://api.arkham.build/v2/oauth/token",
              scopes: {
                "profile:read": "Read the stable account ID and username",
                "decks:read": "Read account and connected ArkhamDB decks",
                "decks:write":
                  "Create, replace, and upgrade decks; implies decks:read",
                "decks:delete":
                  "Delete decks and history; implies decks:write and decks:read",
              },
            },
          },
        },
      },
    },
  } as const;
}

export function serializeOAuthUserOpenApiDocument() {
  return `${JSON.stringify(createOAuthUserOpenApiDocument(), null, 2)}\n`;
}

function authorizationQueryParameters() {
  return [
    {
      name: "response_type",
      in: "query",
      required: true,
      description: "Only code is supported",
      schema: { type: "string", enum: ["code"] },
    },
    {
      name: "client_id",
      in: "query",
      required: true,
      description: "Registered confidential client ID",
      schema: { type: "string", format: "uuid" },
    },
    {
      name: "redirect_uri",
      in: "query",
      required: true,
      description:
        "Exact registered HTTPS, loopback HTTP, or native custom-scheme redirect URI",
      schema: { type: "string" },
    },
    {
      name: "scope",
      in: "query",
      required: true,
      description:
        "Space-separated scopes. profile:read is mandatory; write and delete scopes imply lesser deck scopes.",
      schema: {
        type: "string",
        examples: ["profile:read decks:read"],
      },
    },
    {
      name: "state",
      in: "query",
      required: true,
      description:
        "Non-empty client-generated value of at most 1024 UTF-8 bytes",
      schema: { type: "string", minLength: 1, maxLength: 1024 },
    },
  ] as const;
}

function redirectResponse() {
  return {
    description:
      "Redirect to the arkham.build consent UI, or after the client and " +
      "redirect URI are trusted, to the registered callback with an OAuth " +
      "error and state. Approval and denial callbacks are issued by the " +
      "session-authenticated consent API. Callback locations may use HTTPS, " +
      "loopback HTTP, or a registered native custom scheme.",
    headers: {
      Location: {
        description: "Consent URL or registered client callback URL",
        schema: {
          type: "string",
          examples: [
            "https://arkham.build/oauth/consent?request=ab_ar_...",
            "https://example.com/oauth/callback?error=invalid_scope&state=...",
            "com.example.app:/oauth/callback?error=access_denied&state=...",
          ],
        },
      },
    },
  };
}

function tokenFormRequestBody() {
  return {
    required: true,
    content: {
      [FORM_CONTENT_TYPE]: {
        schema: {
          oneOf: [
            schemaReference("OAuthAuthorizationCodeTokenRequest"),
            schemaReference("OAuthRefreshTokenRequest"),
          ],
          discriminator: { propertyName: "grant_type" },
        },
      },
    },
  };
}

function deckTargetParameters() {
  return [deckSourceParameter(), deckIdParameter()];
}

function deckSourceParameter() {
  return pathParameter(
    "source",
    "OAuthDeckSource",
    "Deck provider: account or arkhamdb",
  );
}

function deckIdParameter() {
  return pathParameter(
    "id",
    "OAuthDeckRouteId",
    "Account deck string ID or ArkhamDB numeric ID, encoded as a path segment",
  );
}

function pathParameter(name: string, schemaName: string, description: string) {
  return {
    name,
    in: "path",
    required: true,
    description,
    schema: schemaReference(schemaName),
  } as const;
}

function queryParameter(name: string, schemaPath: string, description: string) {
  return {
    name,
    in: "query",
    required: false,
    description,
    schema: { $ref: schemaPath },
  } as const;
}

function oauthSecurity(scope: string) {
  return [{ OAuthBearer: [scope] }];
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

function emptyResponse(
  description: string,
  headers?: ReturnType<typeof noStoreHeaders>,
) {
  return { description, ...(headers ? { headers } : {}) };
}

function jsonResponse(
  schemaName: string,
  description: string,
  headers?: ReturnType<typeof noStoreHeaders>,
) {
  return {
    description,
    ...(headers ? { headers } : {}),
    content: {
      [JSON_CONTENT_TYPE]: {
        schema: schemaReference(schemaName),
      },
    },
  };
}

function bearerErrorResponse(description: string) {
  return {
    ...jsonResponse("OAuthUserError", description),
    headers: {
      "WWW-Authenticate": {
        description: "Bearer authentication challenge",
        schema: { type: "string", examples: ["Bearer"] },
      },
    },
  };
}

function bearerForbiddenResponse(description: string) {
  return {
    ...jsonResponse("OAuthUserError", description),
    headers: {
      "WWW-Authenticate": {
        description:
          "Bearer challenge, including the required scope when absent",
        schema: {
          type: "string",
          examples: ['Bearer error="insufficient_scope", scope="decks:write"'],
        },
      },
    },
  };
}

function noStoreHeaders() {
  return {
    "Cache-Control": {
      description: "Prevents storage of credential-bearing responses",
      schema: { type: "string", const: "no-store" },
    },
    Pragma: {
      description: "HTTP/1.0 cache prevention",
      schema: { type: "string", const: "no-cache" },
    },
  } as const;
}

function schemaReference(schemaName: string) {
  return { $ref: `#/components/schemas/${schemaName}` } as const;
}

function jsonSchema(schema: ZodType) {
  return z.toJSONSchema(schema);
}
