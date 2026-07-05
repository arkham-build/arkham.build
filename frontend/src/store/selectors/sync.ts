import type { Id } from "@arkham-build/shared";
import { createSelector } from "reselect";
import type { StoreState } from "../slices";
import type { SyncStatus } from "../slices/sync.types";

const ACCOUNT_SYNC_STATUS_PRIORITY: Record<SyncStatus, number> = {
  idle: 0,
  synced: 0,
  loading: 1,
  saving: 1,
  partial: 2,
  error: 3,
  conflict: 4,
};

export const selectAccountSyncStatus = createSelector(
  (state: StoreState) => state.sync.settings.status,
  (state: StoreState) => state.sync.decks.status,
  (state: StoreState) => state.sync.folders.status,
  (state: StoreState) => state.sync.cardTags.status,
  (...statuses) =>
    statuses.reduce((current, next) =>
      ACCOUNT_SYNC_STATUS_PRIORITY[next] > ACCOUNT_SYNC_STATUS_PRIORITY[current]
        ? next
        : current,
    ),
);

export const selectDeckHasConflict = createSelector(
  (_: StoreState, id: Id) => String(id),
  (state: StoreState) => state.sync.decks.items,
  (id, items) => items[id]?.status === "conflict",
);
