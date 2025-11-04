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

  const sync = useStore((state) => state.sync);

  const syncHandler = useCallback(
    async (create?: SyncInit) => {
      const provider = "ArkhamDB";

      const toastId = toast.show({
        children: t("settings.connections.provider_syncing", { provider }),
        variant: "loading",
      });

      try {
        await sync(create);
        toast.dismiss(toastId);

        toast.show({
          children: t("settings.connections.provider_success", { provider }),
          duration: 3000,
          variant: "success",
        });
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
    [sync, toast, t],
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
