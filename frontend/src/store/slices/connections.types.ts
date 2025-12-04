import type { Id } from "../schemas/deck.schema";

export type Provider = "arkhamdb";

type ConnectionStatus = "connected" | "disconnected";

type ConnectionUser = {
  id?: number | string;
  username?: string;
};

export type SyncSuccessState = {
  status: "success";
  lastModified?: string;
  errors: string[];
  itemsSynced: number;
  itemsTotal: number;
};

type SyncErrorState = {
  status: "error";
  errors: string[];
};

export type Connection = {
  createdAt: number;
  provider: Provider;
  status: ConnectionStatus;
  syncDetails?: SyncSuccessState | SyncErrorState;
  user: ConnectionUser;
};

export type ConnectionsState = {
  data: Record<string, Connection>;
  lastSyncedAt?: number;
};

export type SyncInit = {
  provider: Provider;
  user: ConnectionUser;
};

export type ConnectionsSlice = {
  connections: ConnectionsState;

  sync(init?: SyncInit): Promise<void>;
  unsync(provider: Provider): Promise<void>;

  uploadDeck(id: Id, provider: Provider): Promise<Id>;
};
