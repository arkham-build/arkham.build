import {
  FolderSyncRequestSchema,
  FolderSyncResponseSchema,
} from "@arkham-build/shared";
import { createRevisionedAccountStateClient } from "./revisioned-account-state";

export const {
  fetch: fetchFolders,
  put: putFolders,
  isConflictError: isFoldersConflictError,
} = createRevisionedAccountStateClient({
  path: "/v2/account/folders",
  requestSchema: FolderSyncRequestSchema,
  responseSchema: FolderSyncResponseSchema,
  conflictErrorName: "FoldersConflictError",
});
