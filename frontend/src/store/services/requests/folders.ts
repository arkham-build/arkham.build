import {
  type FolderSyncRequest,
  FolderSyncRequestSchema,
  type FolderSyncResponse,
  FolderSyncResponseSchema,
} from "@arkham-build/shared";
import type { HttpClient } from "../http-client";
import { ApiError } from "./shared";

class FoldersConflictError extends ApiError {
  remote: FolderSyncResponse | null;

  constructor(error: ApiError) {
    super(error.message, error.status, error.cause);
    this.name = "FoldersConflictError";
    this.remote = parseConflictCause(error.cause);
  }
}

export async function fetchFolders(
  client: HttpClient,
): Promise<FolderSyncResponse> {
  const res = await client.request("/v2/account/folders", {
    credentials: "include",
  });

  return FolderSyncResponseSchema.parse(await res.json());
}

export async function putFolders(
  client: HttpClient,
  payload: FolderSyncRequest,
): Promise<FolderSyncResponse> {
  try {
    const res = await client.request("/v2/account/folders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(FolderSyncRequestSchema.parse(payload)),
      credentials: "include",
    });

    return FolderSyncResponseSchema.parse(await res.json());
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new FoldersConflictError(error);
    }

    throw error;
  }
}

export function isFoldersConflictError(
  error: unknown,
): error is FoldersConflictError {
  return error instanceof FoldersConflictError;
}

function parseConflictCause(cause: unknown): FolderSyncResponse | null {
  const result = FolderSyncResponseSchema.safeParse(cause);
  return result.success ? result.data : null;
}
