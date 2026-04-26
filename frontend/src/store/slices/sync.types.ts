import type { SettingsResponse } from "@arkham-build/shared";

export type SyncStatus =
  | "idle"
  | "loading"
  | "saving"
  | "synced"
  | "conflict"
  | "error";

export type SettingsSyncState = {
  accountId: string | null;
  revision: string | null;
  lastSyncedAt: number | null;
  status: SyncStatus;
  error: string | null;
  conflict: SettingsResponse | null;
};

export type SyncState = {
  sync: {
    settings: SettingsSyncState;
  };
};

export type SyncSlice = SyncState & {
  bootstrapAuthenticatedState(): Promise<void>;
  resetSync(): void;
  setSettingsSync(payload: Partial<SettingsSyncState>): void;
};
