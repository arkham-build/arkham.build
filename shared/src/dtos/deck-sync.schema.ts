import { z } from "zod";
import { DeckIdSchema, DeckSchema } from "../schemas/deck.schema.ts";

export const SyncedDeckProviderSchema = z.enum(["account", "arkhamdb"]);
export type SyncedDeckProvider = z.infer<typeof SyncedDeckProviderSchema>;

export const DeckSyncTargetSchema = z.object({
  provider: SyncedDeckProviderSchema,
  id: DeckIdSchema,
});
export type DeckSyncTarget = z.infer<typeof DeckSyncTargetSchema>;

export const DeckWritePayloadSchema = DeckSchema.omit({
  date_creation: true,
  date_update: true,
  source: true,
  user_id: true,
});
export type DeckWritePayload = z.infer<typeof DeckWritePayloadSchema>;

export const DeckManifestItemSchema = DeckSyncTargetSchema.extend({
  version: z.string(),
  updatedAt: z.string(),
});
export type DeckManifestItem = z.infer<typeof DeckManifestItemSchema>;

const DeckManifestProviderStateSchema = z.object({
  available: z.boolean(),
});

export const DeckManifestResponseSchema = z.object({
  version: z.string(),
  decks: z.array(DeckManifestItemSchema),
  arkhamdbSyncToken: z.string().nullish(),
  providers: z.object({
    account: DeckManifestProviderStateSchema,
    arkhamdb: DeckManifestProviderStateSchema,
  }),
});
export type DeckManifestResponse = z.infer<typeof DeckManifestResponseSchema>;

export const DECK_BATCH_TARGET_LIMIT = 250;

export const DeckBatchRequestSchema = z.object({
  targets: z.array(DeckSyncTargetSchema).max(DECK_BATCH_TARGET_LIMIT),
  arkhamdbSyncToken: z.string().nullish(),
});
export type DeckBatchRequest = z.infer<typeof DeckBatchRequestSchema>;

export const DeckUpdateRequestSchema = DeckWritePayloadSchema.extend({
  expectedVersion: z.string(),
  source: SyncedDeckProviderSchema,
});
export type DeckUpdateRequest = z.infer<typeof DeckUpdateRequestSchema>;

export const DeckDeleteRequestSchema = z.object({
  expectedVersion: z.string(),
  provider: SyncedDeckProviderSchema,
});
export type DeckDeleteRequest = z.infer<typeof DeckDeleteRequestSchema>;

export const DeckUpgradeRequestSchema = z.object({
  deck: DeckSchema,
  expectedVersion: z.string(),
  provider: SyncedDeckProviderSchema,
});
export type DeckUpgradeRequest = z.infer<typeof DeckUpgradeRequestSchema>;

export const DeckBatchResponseSchema = z.array(DeckSchema);
export type DeckBatchResponse = z.infer<typeof DeckBatchResponseSchema>;

export const DeckConflictResponseSchema = z.object({
  remoteDeck: DeckSchema.nullish(),
  remoteVersion: z.string().nullable(),
});
export type DeckConflictResponse = z.infer<typeof DeckConflictResponseSchema>;
