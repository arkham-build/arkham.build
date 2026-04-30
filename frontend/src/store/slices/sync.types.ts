import type { SettingsResponse } from "@arkham-build/shared";
import type { Id } from "../schemas/deck.schema";
import type { HttpClient } from "../services/http-client";
import type { AuthState } from "./auth.types";

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

type DeckSyncConflictState = {
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

type DeckConflictResolutionResult = {
  kind: NonNullable<DeckSyncItemState["conflict"]>["kind"];
};

export type SyncSlice = SyncState & {
  bootstrapAuthenticatedState(client: HttpClient): Promise<void>;
  clearAccountState(auth?: AuthState): void;
  setSettingsSync(payload: Partial<SettingsSyncState>): void;
  setDecksSync(payload: Partial<DecksSyncState>): void;
  setDeckSyncItem(id: Id, payload: Partial<DeckSyncItemState> | null): void;
  syncDecks(client: HttpClient): Promise<void>;
  resolveDeckConflictWithRefresh(
    client: HttpClient,
    id: Id,
  ): Promise<DeckConflictResolutionResult>;
  resolveDeckConflictWithDiscard(id: Id): Promise<DeckConflictResolutionResult>;
};
