import { CheckIcon, CloudOffIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import { selectAvailableConnections } from "@/store/selectors/connections";
import { selectConnectionLock } from "@/store/selectors/shared";
import type { Connection, Provider } from "@/store/slices/connections.types";
import { cx } from "@/utils/cx";
import { capitalize, formatDate, formatProviderName } from "@/utils/formatting";
import css from "./connections.module.css";

export function Connections() {
  const connections = useStore((state) => state.connections);

  return (
    <>
      {selectAvailableConnections().map((provider) => {
        const connection: Connection | undefined = connections.data?.[provider];

        return (
          <article className={css["connection"]} key={provider}>
            <header className={css["header"]}>
              <h3 className={css["title"]}>
                <i className="icon-elder_sign" />
                ArkhamDB
              </h3>
              {connection?.status && (
                <ConnectionStatusOutput connection={connection} />
              )}
            </header>
            <div className={css["content"]}>
              {connection != null ? (
                <ConnectionDetails
                  connection={connection}
                  lastSyncedAt={connections.lastSyncedAt}
                />
              ) : (
                <ConnectionInit provider={provider} />
              )}
            </div>
          </article>
        );
      })}
    </>
  );
}

function ConnectionStatusOutput(props: { connection: Connection }) {
  const { status } = props.connection;
  const { t } = useTranslation();

  return (
    <output className={css["status"]} data-testid="connection-status">
      <span className={cx(css["status-icon"], css[status])}>
        {status === "connected" && <CheckIcon />}
        {status === "disconnected" && <CloudOffIcon />}
      </span>
      <span>
        {status === "connected" && t("settings.connections.connected")}
        {status === "disconnected" && t("settings.connections.disconnected")}
      </span>
    </output>
  );
}

function ConnectionDetails(props: {
  connection: Connection;
  lastSyncedAt?: number;
}) {
  const { t } = useTranslation();

  const { connection, lastSyncedAt } = props;
  const unsync = useStore((state) => state.unsync);

  const connectionLock = useStore(selectConnectionLock);

  const onRemoveConnection = useCallback(async () => {
    // TODO: surface this error
    await unsync(connection.provider as Provider).catch(console.error);
  }, [unsync, connection]);

  return (
    <>
      <details className={css["details"]}>
        <summary>{t("settings.connections.details")}</summary>
        <dl className={css["details-properties"]}>
          {connection.user.username && (
            <>
              <dt>{t("settings.connections.username")}</dt>
              <dd>{connection.user.username}</dd>
            </>
          )}
          {connection.user.id && (
            <>
              <dt>{t("settings.connections.user_id")}</dt>
              <dd>{connection.user.id}</dd>
            </>
          )}
          <dt>{t("settings.connections.created_at")}</dt>
          <dd>{formatDate(connection.createdAt)}</dd>
          <dt>{t("settings.connections.last_synced_at")}</dt>
          <dd>{lastSyncedAt ? new Date(lastSyncedAt).toUTCString() : "-"}</dd>

          {connection.syncDetails && (
            <>
              <dt>{t("settings.connections.sync_status")}</dt>
              <dd>{capitalize(connection.syncDetails.status)}</dd>
              {connection.syncDetails.status === "success" && (
                <>
                  <dt>{t("settings.connections.items_synced")}</dt>
                  <dd>
                    {connection.syncDetails.itemsSynced} /{" "}
                    {connection.syncDetails.itemsTotal}
                  </dd>
                  <dt>{t("settings.connections.last_modified")}</dt>
                  <dd>{connection.syncDetails.lastModified}</dd>
                </>
              )}
              <dt>{t("settings.connections.sync_errors")}</dt>
              <dd>
                {connection.syncDetails?.errors?.length
                  ? connection.syncDetails.errors.join(", ")
                  : t("settings.connections.no_errors")}
              </dd>
            </>
          )}
        </dl>
      </details>
      <div className={css["actions"]}>
        <Button
          as="a"
          disabled={!!connectionLock}
          href={`${import.meta.env.VITE_API_LEGACY_URL}/auth/signin?provider=${connection.provider}`}
          type="button"
          size="sm"
        >
          {t("settings.connections.reconnect")}
        </Button>
        <Button
          type="button"
          disabled={!!connectionLock}
          onClick={onRemoveConnection}
          size="sm"
        >
          {t("settings.connections.disconnect")}
        </Button>
      </div>
    </>
  );
}

function ConnectionInit(props: { provider: Provider }) {
  const { t } = useTranslation();
  const { provider } = props;

  return (
    <>
      <p className={css["info-text"]}>
        {t("settings.connections.connect_help", {
          provider: formatProviderName(provider),
        })}
      </p>
      <div className={css["actions"]}>
        <Button
          as="a"
          href={`${import.meta.env.VITE_API_LEGACY_URL}/auth/signin?provider=${provider}`}
          type="button"
          size="sm"
        >
          {t("settings.connections.connect")}
        </Button>
      </div>
    </>
  );
}
