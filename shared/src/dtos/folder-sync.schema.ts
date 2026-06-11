import { z } from "zod";

export const FOLDER_ID_MAX_LENGTH = 255;
export const FOLDER_NAME_MAX_LENGTH = 255;
export const FOLDER_SYNC_DECK_FOLDERS_LIMIT = 10000;
export const FOLDER_SYNC_FOLDERS_LIMIT = 1000;

export const FolderSchema = z.object({
  id: z.string().max(FOLDER_ID_MAX_LENGTH),
  name: z.string().max(FOLDER_NAME_MAX_LENGTH),
  icon: z.string().max(255).optional(),
  color: z.string().max(255).optional(),
  parent_id: z.string().max(FOLDER_ID_MAX_LENGTH).optional(),
});

export type Folder = z.infer<typeof FolderSchema>;

export const FolderSyncStateSchema = z.object({
  folders: z
    .record(z.string().max(FOLDER_ID_MAX_LENGTH), FolderSchema)
    .refine((value) => Object.keys(value).length <= FOLDER_SYNC_FOLDERS_LIMIT),
  deckFolders: z
    .record(z.string().max(255), z.string().max(FOLDER_ID_MAX_LENGTH))
    .refine(
      (value) => Object.keys(value).length <= FOLDER_SYNC_DECK_FOLDERS_LIMIT,
    ),
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
