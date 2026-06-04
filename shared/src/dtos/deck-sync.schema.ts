import { z } from "zod";
import { DeckIdSchema, DeckSchema } from "../schemas/deck.schema.ts";

export const DeckWritePayloadSchema = DeckSchema.omit({
  date_creation: true,
  date_update: true,
  source: true,
  user_id: true,
});
export type DeckWritePayload = z.infer<typeof DeckWritePayloadSchema>;

export const DeckManifestItemSchema = z.object({
  id: DeckIdSchema,
  version: z.string(),
  updatedAt: z.string(),
});
export type DeckManifestItem = z.infer<typeof DeckManifestItemSchema>;

export const DeckManifestResponseSchema = z.object({
  version: z.string(),
  decks: z.array(DeckManifestItemSchema),
  arkhamdbSyncToken: z.string().nullish(),
});
export type DeckManifestResponse = z.infer<typeof DeckManifestResponseSchema>;

export const DeckBatchRequestSchema = z.object({
  ids: z.array(DeckIdSchema),
  arkhamdbSyncToken: z.string().nullish(),
});
export type DeckBatchRequest = z.infer<typeof DeckBatchRequestSchema>;

export const DeckUpdateRequestSchema = DeckWritePayloadSchema.extend({
  expectedVersion: z.string(),
});
export type DeckUpdateRequest = z.infer<typeof DeckUpdateRequestSchema>;

export const DeckDeleteRequestSchema = z.object({
  expectedVersion: z.string(),
});
export type DeckDeleteRequest = z.infer<typeof DeckDeleteRequestSchema>;

export const DeckUpgradeRequestSchema = z.object({
  deck: DeckSchema,
  expectedVersion: z.string(),
});
export type DeckUpgradeRequest = z.infer<typeof DeckUpgradeRequestSchema>;

export const DeckBatchResponseSchema = z.array(DeckSchema);
export type DeckBatchResponse = z.infer<typeof DeckBatchResponseSchema>;

export const DeckConflictResponseSchema = z.object({
  remoteDeck: DeckSchema.nullish(),
  remoteVersion: z.string().nullable(),
});
export type DeckConflictResponse = z.infer<typeof DeckConflictResponseSchema>;
