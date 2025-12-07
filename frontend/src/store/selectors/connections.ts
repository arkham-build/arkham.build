import { createSelector } from "reselect";
import type { StoreState } from "../slices";
import type { ConnectionsState } from "../slices/connections.types";

const AVAILABLE_CONNECTIONS = ["arkhamdb"] as const;

export function selectAvailableConnections() {
  return AVAILABLE_CONNECTIONS;
}

export const selectConnectionsData = createSelector(
  (state: StoreState) => state.connections,
  (connections) => Object.values(connections.data),
);

export function syncHealthy(connections: ConnectionsState) {
  return Object.values(connections.data).every((c) => c.status === "connected");
}
