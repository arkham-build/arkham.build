import type { RevisionSyncState } from "../slices/sync.types";

export function getInitialRevisionSyncState<
  Remote,
>(): RevisionSyncState<Remote> {
  return {
    accountId: null,
    revision: null,
    lastSyncedAt: null,
    status: "idle",
    error: null,
    conflict: null,
  };
}

export function revisionSyncStarted(
  accountId: string,
  status: "loading" | "saving",
) {
  return { accountId, status, error: null, conflict: null };
}

export function revisionSyncSucceeded(
  accountId: string,
  revision: string | null,
) {
  return {
    accountId,
    revision,
    lastSyncedAt: Date.now(),
    status: "synced" as const,
    error: null,
    conflict: null,
  };
}

export function revisionSyncFailed<Remote = never>(
  accountId: string,
  error: unknown,
  isConflictError?: (error: unknown) => error is { remote: Remote | null },
) {
  const failure = {
    accountId,
    error: error instanceof Error ? error.message : "Unknown error",
  };

  if (isConflictError?.(error)) {
    return { ...failure, status: "conflict" as const, conflict: error.remote };
  }

  return { ...failure, status: "error" as const, conflict: null };
}

export function getExpectedRevision(
  state: Pick<RevisionSyncState<unknown>, "accountId" | "revision">,
  accountId: string,
  override?: string | null,
) {
  return override !== undefined
    ? override
    : state.accountId === accountId
      ? state.revision
      : null;
}
