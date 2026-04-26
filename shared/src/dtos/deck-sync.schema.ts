import { z } from "zod";
import { DeckIdSchema, DeckSchema } from "../schemas/deck.schema.ts";

const DeckWritePayloadSchema = DeckSchema.omit({
  date_creation: true,
  date_update: true,
  source: true,
  user_id: true,
});

export const DeckManifestItemSchema = z.object({
  id: DeckIdSchema,
  version: z.string(),
  updatedAt: z.string(),
});
export type DeckManifestItem = z.infer<typeof DeckManifestItemSchema>;

export const DeckManifestResponseSchema = z.object({
  version: z.string(),
  decks: z.array(DeckManifestItemSchema),
});
export type DeckManifestResponse = z.infer<typeof DeckManifestResponseSchema>;

export const DeckBatchRequestSchema = z.object({
  ids: z.array(DeckIdSchema),
});
export type DeckBatchRequest = z.infer<typeof DeckBatchRequestSchema>;

export const DeckCreateRequestSchema = DeckWritePayloadSchema;
export type DeckCreateRequest = z.infer<typeof DeckCreateRequestSchema>;

export const DeckUpdateRequestSchema = DeckWritePayloadSchema.extend({
  expectedVersion: z.string(),
});
export type DeckUpdateRequest = z.infer<typeof DeckUpdateRequestSchema>;

export const DeckDeleteRequestSchema = z.object({
  expectedVersion: z.string(),
});
export type DeckDeleteRequest = z.infer<typeof DeckDeleteRequestSchema>;

export const DeckBatchResponseSchema = z.array(DeckSchema);
export type DeckBatchResponse = z.infer<typeof DeckBatchResponseSchema>;

export const DeckConflictResponseSchema = z.object({
  remoteDeck: DeckSchema.nullish(),
  remoteVersion: z.string().nullable(),
});
export type DeckConflictResponse = z.infer<typeof DeckConflictResponseSchema>;
