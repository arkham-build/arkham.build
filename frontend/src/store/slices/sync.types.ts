import type { SettingsResponse } from "@arkham-build/shared";
import type { Id } from "../schemas/deck.schema";

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

export type DeckSyncConflictState = {
  kind: "update" | "delete" | "upgrade";
  remoteVersion: string | null;
};

export type DeckSyncItemState = {
  version: string | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  conflict: DeckSyncConflictState | null;
};

export type DecksSyncState = {
  accountId: string | null;
  manifestVersion: string | null;
  lastSyncedAt: number | null;
  status: SyncStatus;
  error: string | null;
  items: Record<string, DeckSyncItemState>;
};

export type SyncState = {
  sync: {
    settings: SettingsSyncState;
    decks: DecksSyncState;
  };
};

export type SyncSlice = SyncState & {
  bootstrapAuthenticatedState(): Promise<void>;
  resetSync(): void;
  setSettingsSync(payload: Partial<SettingsSyncState>): void;
  setDecksSync(payload: Partial<DecksSyncState>): void;
  setDeckSyncItem(id: Id, payload: Partial<DeckSyncItemState> | null): void;
};
