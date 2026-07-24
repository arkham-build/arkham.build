import {
  DECK_ID_MAX_LENGTH,
  DECK_BATCH_TARGET_LIMIT,
  DeckSchema,
} from "@arkham-build/shared";
import { z } from "zod";

export const OAuthUserErrorSchema = z
  .object({
    error: z.enum([
      "invalid_token",
      "insufficient_scope",
      "account_banned",
      "invalid_request",
      "not_found",
      "conflict",
      "upstream_unavailable",
    ]),
    message: z.string(),
  })
  .strict();

export const OAuthProfileResponseSchema = z
  .object({
    id: z.uuid(),
    username: z.string(),
  })
  .strict();

export const OAuthDeckSourceSchema = z.enum(["account", "arkhamdb"]);
export type OAuthDeckSource = z.infer<typeof OAuthDeckSourceSchema>;

export const OAuthDeckSchema = DeckSchema.strict();
export type OAuthDeck = z.infer<typeof OAuthDeckSchema>;

const OAuthAccountDeckTargetSchema = z
  .object({
    source: z.literal("account"),
    id: z.string().min(1).max(DECK_ID_MAX_LENGTH),
  })
  .strict();

const OAuthArkhamDbDeckTargetSchema = z
  .object({
    source: z.literal("arkhamdb"),
    id: z.number().int().positive(),
  })
  .strict();

export const OAuthDeckRouteIdSchema = z.string();

export const OAuthDeckTargetSchema = z.discriminatedUnion("source", [
  OAuthAccountDeckTargetSchema,
  OAuthArkhamDbDeckTargetSchema,
]);
export type OAuthDeckTarget = z.infer<typeof OAuthDeckTargetSchema>;

export const OAuthDeckManifestQuerySchema = z
  .object({ source: OAuthDeckSourceSchema.optional() })
  .strict();

export const OAuthDeckManifestItemSchema = z.discriminatedUnion("source", [
  OAuthAccountDeckTargetSchema.extend({
    updatedAt: z.string(),
    version: z.string(),
  }),
  OAuthArkhamDbDeckTargetSchema.extend({
    updatedAt: z.string(),
    version: z.string(),
  }),
]);

const OAuthDeckProviderStateSchema = z
  .object({ available: z.boolean() })
  .strict();

export const OAuthDeckManifestResponseSchema = z
  .object({
    version: z.string(),
    providers: z
      .object({
        account: OAuthDeckProviderStateSchema,
        arkhamdb: OAuthDeckProviderStateSchema,
      })
      .strict(),
    decks: z.array(OAuthDeckManifestItemSchema),
  })
  .strict();

export const OAuthDeckBatchRequestSchema = z
  .object({
    decks: z.array(OAuthDeckTargetSchema).max(DECK_BATCH_TARGET_LIMIT),
  })
  .strict();

export const OAuthDeckBatchResponseSchema = z
  .object({ decks: z.array(OAuthDeckSchema) })
  .strict();

export const OAuthDeckDeleteQuerySchema = z
  .object({ all: z.enum(["true", "false"]).optional() })
  .strict();
