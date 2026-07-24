import { z } from "zod";

export const OAuthErrorCodeSchema = z.enum([
  "invalid_request",
  "invalid_client",
  "invalid_grant",
  "invalid_scope",
  "unauthorized_client",
  "unsupported_grant_type",
  "unsupported_response_type",
]);

export const OAuthErrorResponseSchema = z
  .object({
    error: OAuthErrorCodeSchema,
    error_description: z.string(),
  })
  .strict();

export const OAuthAuthorizationQuerySchema = z.object({
  response_type: z
    .string()
    .optional()
    .meta({ examples: ["code"] }),
  client_id: z
    .string()
    .optional()
    .meta({
      examples: ["019c1234-5678-7000-8000-000000000000"],
    }),
  redirect_uri: z
    .string()
    .optional()
    .meta({
      examples: ["https://example.com/oauth/callback"],
    }),
  scope: z
    .string()
    .optional()
    .meta({
      examples: ["profile:read decks:read"],
    }),
  state: z
    .string()
    .optional()
    .meta({ examples: ["opaque-client-state"] }),
});

const OAuthClientIdFormFieldSchema = z
  .string()
  .optional()
  .meta({
    examples: ["019c1234-5678-7000-8000-000000000000"],
  });

const OAuthClientSecretFormFieldSchema = z
  .string()
  .optional()
  .meta({
    examples: ["ab_cs_..."],
  });

export const OAuthTokenFormSchema = z
  .object({
    grant_type: z
      .string()
      .optional()
      .meta({
        examples: ["authorization_code"],
      }),
    client_id: OAuthClientIdFormFieldSchema,
    client_secret: OAuthClientSecretFormFieldSchema,
    code: z
      .string()
      .optional()
      .meta({ examples: ["ab_code_..."] }),
    redirect_uri: z
      .string()
      .optional()
      .meta({
        examples: ["https://example.com/oauth/callback"],
      }),
    refresh_token: z
      .string()
      .optional()
      .meta({ examples: ["ab_rt_..."] }),
    scope: z.string().optional(),
  })
  .strict();

export const OAuthTokenResponseSchema = z
  .object({
    token_type: z.literal("Bearer"),
    access_token: z.string().startsWith("ab_at_"),
    expires_in: z.literal(3600),
    refresh_token: z.string().startsWith("ab_rt_"),
    scope: z.string(),
  })
  .strict();

export const OAuthRevocationFormSchema = z
  .object({
    client_id: OAuthClientIdFormFieldSchema,
    client_secret: OAuthClientSecretFormFieldSchema,
    token: z
      .string()
      .optional()
      .meta({ examples: ["ab_rt_..."] }),
    token_type_hint: z
      .string()
      .optional()
      .meta({
        examples: ["refresh_token"],
      }),
  })
  .strict();
