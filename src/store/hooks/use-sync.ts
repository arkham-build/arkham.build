import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/toast.hooks";
import { isEmpty } from "@/utils/is-empty";
import { useStore } from "..";
import { syncHealthy } from "../selectors/connections";
import type { ConnectionsState } from "../slices/connections.types";

export function useSync() {
  const toast = useToast();
  const { t } = useTranslation();

  const sync = useStore((state) => state.sync);

  const onSync = useCallback(
    async (connections: ConnectionsState) => {
      if (!syncHealthy(connections) || isEmpty(connections.data)) return;

      const provider = "ArkhamDB";

      const toastId = toast.show({
        children: t("settings.connections.provider_syncing", { provider }),
        variant: "loading",
      });

      try {
        await sync();
        toast.dismiss(toastId);

        toast.show({
          children: t("settings.connections.provider_success", { provider }),
          duration: 3000,
          variant: "success",
        });
      } catch (err) {
        console.error(err);
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

  return onSync;
}
