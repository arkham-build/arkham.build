import { z } from "zod";

export const OAUTH_SCOPES = [
  "profile:read",
  "decks:read",
  "decks:write",
  "decks:delete",
] as const;

export const OAuthScopeSchema = z.enum(OAUTH_SCOPES);
export type OAuthScope = z.infer<typeof OAuthScopeSchema>;

export const OAuthAuthorizationRequestTokenSchema = z
  .string()
  .regex(/^ab_ar_[A-Za-z0-9_-]{43}$/);
export type OAuthAuthorizationRequestToken = z.infer<
  typeof OAuthAuthorizationRequestTokenSchema
>;

export const OAuthConsentDetailsResponseSchema = z
  .object({
    client: z
      .object({
        id: z.uuid(),
        name: z.string(),
      })
      .strict(),
    scopes: z.array(OAuthScopeSchema),
    expiresAt: z.iso.datetime(),
  })
  .strict();
export type OAuthConsentDetailsResponse = z.infer<
  typeof OAuthConsentDetailsResponseSchema
>;
