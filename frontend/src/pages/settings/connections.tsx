import {
  type Identity,
  isArkhamDBIdentity,
  OAUTH_CONNECTIONS,
  type OAuthConnection,
} from "@arkham-build/shared";
import { CheckIcon, CloudOffIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast.hooks";
import { useDisconnectOAuthIdentityMutation } from "@/queries/mutations/auth";
import { useStore } from "@/store";
import { selectSession } from "@/store/selectors/auth";
import { cx } from "@/utils/cx";
import { formatDate } from "@/utils/formatting";
import css from "./connections.module.css";
import { Section } from "./section";

export function OAuthConnections() {
  const { t } = useTranslation();

  return (
    <Section title={t("settings.account.oauth.title")}>
      {OAUTH_CONNECTIONS.map((connection) => (
        <Connection connection={connection} key={connection.provider} />
      ))}
    </Section>
  );
}

function Connection(props: { connection: OAuthConnection }) {
  const { connection } = props;
  const { t } = useTranslation();
  const session = useStore(selectSession);
  const toast = useToast();
  const disconnectOAuthIdentityMutation = useDisconnectOAuthIdentityMutation();

  const providerName = t(
    `settings.account.oauth.providers.${connection.provider}`,
  );
  const identity = session?.identities.find(
    (item) => item.provider === connection.provider,
  );
  const isConnected = !!identity;
  const status = getConnectionStatus(identity);

  const onDisconnect = async () => {
    const toastId = toast.show({
      children: t("settings.account.oauth.disconnecting", {
        provider: providerName,
      }),
      variant: "loading",
    });

    try {
      await disconnectOAuthIdentityMutation.mutateAsync(connection.provider);
      toast.dismiss(toastId);
    } catch (error) {
      toast.dismiss(toastId);
      toast.show({
        children: t("settings.account.oauth.disconnect_error", {
          error: (error as Error).message,
          provider: providerName,
        }),
        variant: "error",
      });
    }
  };

  return (
    <article className={css.connection}>
      <header className={css.header}>
        <h3 className={css.title}>
          <i className={connection.icon} />
          {providerName}
        </h3>
        {isConnected && (
          <output className={css.status} data-testid="connection-status">
            <span className={cx(css["status-icon"], css[status])}>
              {status === "connected" ? <CheckIcon /> : <CloudOffIcon />}
            </span>
            <span>
              {t(
                status === "connected"
                  ? "settings.account.oauth.connected"
                  : "settings.account.oauth.disconnected",
              )}
            </span>
          </output>
        )}
      </header>
      <div className={css.content}>
        {isConnected ? (
          <>
            <ConnectionDetails identity={identity} />
            <div className={css.actions}>
              <Button
                as="a"
                disabled={disconnectOAuthIdentityMutation.isPending}
                href={`${import.meta.env.VITE_API_URL}/auth/arkhamdb/connect`}
                variant="secondary"
              >
                {t("settings.account.oauth.reconnect")}
              </Button>
              <Button
                disabled={disconnectOAuthIdentityMutation.isPending}
                onClick={onDisconnect}
                variant="secondary"
              >
                {t("settings.account.oauth.disconnect")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p>
              {t("settings.account.oauth.connect_help", {
                provider: providerName,
              })}
            </p>
            <div className={css.actions}>
              <Button
                as="a"
                disabled={disconnectOAuthIdentityMutation.isPending}
                href={`${import.meta.env.VITE_API_URL}/auth/arkhamdb/connect`}
                variant="secondary"
              >
                {t("settings.account.oauth.connect")}
              </Button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function ConnectionDetails({ identity }: { identity: Identity }) {
  const { t } = useTranslation();

  if (!isArkhamDBIdentity(identity)) return null;

  return (
    <details className={css["details"]}>
      <summary>{t("settings.account.oauth.details")}</summary>
      <dl className={css["details-properties"]}>
        {identity.details.username && (
          <>
            <dt>{t("settings.account.profile.username")}</dt>
            <dd>{identity.details.username}</dd>
          </>
        )}
        {identity.providerUserId && (
          <>
            <dt>{t("settings.account.oauth.user_id")}</dt>
            <dd>{identity.providerUserId}</dd>
          </>
        )}
        <dt>{t("settings.account.oauth.created_at")}</dt>
        <dd>{formatDate(identity.details.createdAt)}</dd>
        <dt>{t("settings.account.oauth.last_synced_at")}</dt>
        <dd>
          {identity.details.lastSyncedAt
            ? new Date(identity.details.lastSyncedAt).toUTCString()
            : "-"}
        </dd>
      </dl>
    </details>
  );
}

function getConnectionStatus(identity: Identity | undefined) {
  if (!identity) {
    return "disconnected";
  }

  if (isArkhamDBIdentity(identity) && identity.details.status !== "healthy") {
    return "disconnected";
  }

  return "connected";
}
