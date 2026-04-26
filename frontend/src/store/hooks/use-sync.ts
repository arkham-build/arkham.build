import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/toast.hooks";
import { isEmpty } from "@/utils/is-empty";
import { useStore } from "..";
import { syncHealthy } from "../selectors/connections";
import type { ConnectionsState, SyncInit } from "../slices/connections.types";

export function useSync() {
  const toast = useToast();
  const { t } = useTranslation();

  const syncConnections = useStore((state) => state.syncConnections);

  const syncHandler = useCallback(
    async (create?: SyncInit) => {
      const provider = "ArkhamDB";

      const toastId = toast.show({
        children: t("settings.connections.provider_syncing", { provider }),
        persistent: true,
        variant: "loading",
      });

      try {
        await syncConnections(create);
        toast.dismiss(toastId);
      } catch (err) {
        toast.dismiss(toastId);
        toast.show({
          children: t("settings.connections.provider_error", {
            provider,
            error: (err as Error).message || "Unknown error",
          }),
          duration: 3000,
          variant: "error",
        });
        throw err;
      }
    },
    [syncConnections, toast, t],
  );

  return syncHandler;
}

export function shouldAutoSync(
  location: string,
  connections: ConnectionsState,
) {
  return (
    !isEmpty(connections.data) &&
    syncHealthy(connections) &&
    !location.includes("/settings") &&
    !location.includes("/connect") &&
    !location.includes("/search") &&
    !location.includes("/blog") &&
    (!connections.lastSyncedAt ||
      Date.now() - connections.lastSyncedAt > 30 * 60 * 1000)
  );
}
