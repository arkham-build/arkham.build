import { z } from "zod";
import { utf8ByteLength } from "../lib/validation.ts";
import {
  CollectionSchema,
  RemoteSettingsSchema,
} from "../schemas/settings.schema.ts";

export const REMOTE_SETTINGS_MAX_BYTES = 64 * 1024;

const RemoteSettingsRequestSchema = RemoteSettingsSchema.partial().refine(
  (value) => utf8ByteLength(JSON.stringify(value)) <= REMOTE_SETTINGS_MAX_BYTES,
);

export const SettingsRequestSchema = z.object({
  collection: CollectionSchema.nullable(),
  expectedRevision: z.uuid().nullable(),
  settings: RemoteSettingsRequestSchema.nullable(),
});

export type SettingsRequest = z.infer<typeof SettingsRequestSchema>;

export const SettingsResponseSchema = z.object({
  collection: CollectionSchema.nullable(),
  revision: z.uuid().nullable(),
  settings: RemoteSettingsRequestSchema.nullable(),
});

export type SettingsResponse = z.infer<typeof SettingsResponseSchema>;
