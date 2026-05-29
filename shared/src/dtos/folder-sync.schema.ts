import { z } from "zod";

export const FolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  parent_id: z.string().optional(),
});

export type Folder = z.infer<typeof FolderSchema>;

export const FolderSyncStateSchema = z.object({
  folders: z.record(z.string(), FolderSchema),
  deckFolders: z.record(z.string(), z.string()),
});

export type FolderSyncState = z.infer<typeof FolderSyncStateSchema>;

export const FolderSyncRequestSchema = z.object({
  expectedRevision: z.uuid().nullable(),
  state: FolderSyncStateSchema,
});

export type FolderSyncRequest = z.infer<typeof FolderSyncRequestSchema>;

export const FolderSyncResponseSchema = z.object({
  revision: z.uuid().nullable(),
  state: FolderSyncStateSchema.nullable(),
});

export type FolderSyncResponse = z.infer<typeof FolderSyncResponseSchema>;
