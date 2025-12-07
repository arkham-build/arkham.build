import { CircleAlertIcon, RefreshCcwIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useStore } from "@/store";
import { useSync } from "@/store/hooks/use-sync";
import { syncHealthy } from "@/store/selectors/connections";
import { cx } from "@/utils/cx";
import { formatProviderName } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import css from "./sync-status.module.css";
import { Button } from "./ui/button";

export function SyncStatus() {
  const [, navigate] = useLocation();
  const connections = useStore((state) => state.connections);
  const healthy = syncHealthy(connections);
  const { t } = useTranslation();

  const sync = useSync();
  const syncing = useStore((state) => state.remoting.sync);

  const collectionLabels = Object.values(connections.data)
    .map((p) => formatProviderName(p.provider))
    .join(" & ");

  const onSyncButtonClick = useCallback(() => {
    if (syncing) return;
    if (healthy) {
      sync();
    } else {
      navigate("~/settings");
    }
  }, [healthy, sync, syncing, navigate]);

  if (isEmpty(connections.data)) return null;

  return (
    <Button
      className={cx(css["sync"], !syncing && !healthy && css["unhealthy"])}
      disabled={syncing}
      onClick={onSyncButtonClick}
      tooltip={
        !syncing ? (
          <p>
            {healthy
              ? t("settings.connections.sync_all", { collectionLabels })
              : t("settings.connections.disconnected_all")}
          </p>
        ) : (
          t("settings.connections.syncing")
        )
      }
      size="sm"
    >
      <RefreshCcwIcon className={cx(syncing && "spin")} />{" "}
      {t("settings.connections.sync")}
      {!syncing && !healthy && (
        <div className={css["unhealthy"]}>
          <CircleAlertIcon />
        </div>
      )}
    </Button>
  );
}
