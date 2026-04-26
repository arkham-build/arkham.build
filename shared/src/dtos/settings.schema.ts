import { z } from "zod";
import {
  CollectionSchema,
  RemoteSettingsSchema,
} from "../schemas/settings.schema.ts";

export const SettingsRequestSchema = z.object({
  collection: CollectionSchema.nullable(),
  expectedRevision: z.uuid().nullable(),
  settings: RemoteSettingsSchema.partial().nullable(),
});

export type SettingsRequest = z.infer<typeof SettingsRequestSchema>;

export const SettingsResponseSchema = z.object({
  collection: CollectionSchema.nullable(),
  revision: z.uuid().nullable(),
  settings: RemoteSettingsSchema.partial().nullable(),
});

export type SettingsResponse = z.infer<typeof SettingsResponseSchema>;
