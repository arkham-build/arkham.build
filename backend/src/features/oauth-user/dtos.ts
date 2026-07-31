import {
  DECK_ID_MAX_LENGTH,
  DECK_BATCH_TARGET_LIMIT,
  DeckMutablePayloadSchema,
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
    id: z.uuid().meta({ description: "Stable arkham.build account ID" }),
    username: z.string(),
  })
  .strict();

export const OAuthDeckSourceSchema = z.enum(["account", "arkhamdb"]).meta({
  description:
    "Deck provider. Account IDs are strings; ArkhamDB IDs are positive integers in JSON request bodies.",
});
export type OAuthDeckSource = z.infer<typeof OAuthDeckSourceSchema>;

export const OAuthDeckSchema = DeckSchema.strict().meta({
  description: "Full external deck representation.",
});
export type OAuthDeck = z.infer<typeof OAuthDeckSchema>;

export const OAuthDeckWriteSchema = DeckMutablePayloadSchema.meta({
  description:
    "Mutable deck content. Additional properties, including server-owned fields, are ignored.",
});
export type OAuthDeckWrite = z.infer<typeof OAuthDeckWriteSchema>;

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

export const OAuthDeckRouteIdSchema = z.string().meta({
  description:
    "Provider-specific deck ID encoded as a path segment: an account string ID or an ArkhamDB positive integer.",
  examples: ["a148f775-4eeb-4c13-9340-60f6b8527512", "12345"],
});

export const OAuthArkhamDbDeckRouteIdSchema = z.string().regex(/^[1-9][0-9]*$/);

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

const OAuthArkhamDbSyncTokenSchema = z.uuid().nullable().meta({
  description:
    "Opaque token selecting the exact ArkhamDB snapshot returned by the manifest, or null when ArkhamDB was not included or available",
});

export const OAuthDeckManifestResponseSchema = z
  .object({
    version: z.string(),
    arkhamdbSyncToken: OAuthArkhamDbSyncTokenSchema,
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
    arkhamdbSyncToken: OAuthArkhamDbSyncTokenSchema.optional(),
    decks: z
      .array(OAuthDeckTargetSchema)
      .max(DECK_BATCH_TARGET_LIMIT)
      .meta({ description: "At most 250 source-and-ID targets" }),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.arkhamdbSyncToken == null &&
      input.decks.some((deck) => deck.source === "arkhamdb")
    ) {
      context.addIssue({
        code: "custom",
        message: "ArkhamDB batch targets require a manifest sync token",
        path: ["arkhamdbSyncToken"],
      });
    }
  });

export const OAuthDeckBatchResponseSchema = z
  .object({ decks: z.array(OAuthDeckSchema) })
  .strict();

export const OAuthDeckDeleteQuerySchema = z
  .object({
    all: z.enum(["true", "false"]).optional().meta({
      description:
        "When true, delete the selected deck and its previous history chain",
    }),
  })
  .strict();
