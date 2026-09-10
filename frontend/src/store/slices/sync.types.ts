import type {
  CardTagsSyncResponse,
  FolderSyncResponse,
  Id,
  SettingsResponse,
} from "@arkham-build/shared";
import type { HttpClient } from "../services/http-client";
import type { AuthState } from "./auth.types";

export type SyncStatus =
  | "idle"
  | "loading"
  | "saving"
  | "synced"
  | "partial"
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

export type FoldersSyncState = {
  accountId: string | null;
  revision: string | null;
  lastSyncedAt: number | null;
  status: SyncStatus;
  error: string | null;
  conflict: FolderSyncResponse | null;
};

export type CardTagsSyncState = {
  accountId: string | null;
  revision: string | null;
  lastSyncedAt: number | null;
  status: SyncStatus;
  error: string | null;
  conflict: CardTagsSyncResponse | null;
};

export type SyncState = {
  sync: {
    settings: SettingsSyncState;
    decks: DecksSyncState;
    folders: FoldersSyncState;
    cardTags: CardTagsSyncState;
  };
};

type DeckConflictResolutionResult = {
  kind: NonNullable<DeckSyncItemState["conflict"]>["kind"];
};

export type SyncSlice = SyncState & {
  bootstrapAuthenticatedState(
    client: HttpClient,
    opts?: { forceArkhamdbSync?: boolean },
  ): Promise<void>;
  clearAccountState(auth?: AuthState): void;
  setSettingsSync(payload: Partial<SettingsSyncState>): void;
  setDecksSync(payload: Partial<DecksSyncState>): void;
  setFoldersSync(payload: Partial<FoldersSyncState>): void;
  setCardTagsSync(payload: Partial<CardTagsSyncState>): void;
  setDeckSyncItem(id: Id, payload: Partial<DeckSyncItemState> | null): void;
  loadRemoteFolders(client: HttpClient): Promise<void>;
  applyRemoteFolders(payload: FolderSyncResponse): Promise<void>;
  saveFolders(
    client: HttpClient,
    opts?: { expectedRevision?: string | null },
  ): Promise<void>;
  loadRemoteCardTags(client: HttpClient): Promise<void>;
  applyRemoteCardTags(payload: CardTagsSyncResponse): Promise<void>;
  saveCardTags(
    client: HttpClient,
    opts?: { expectedRevision?: string | null },
  ): Promise<void>;
  syncDecks(
    client: HttpClient,
    opts?: { forceArkhamdbSync?: boolean },
  ): Promise<void>;
  resolveDeckConflictWithRefresh(
    client: HttpClient,
    id: Id,
  ): Promise<DeckConflictResolutionResult>;
  resolveDeckConflictWithDiscard(id: Id): Promise<DeckConflictResolutionResult>;
};
