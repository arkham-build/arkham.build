import {
  type Identity,
  isArkhamDBIdentity,
  isSteamIdentity,
  OAUTH_CONNECTIONS,
  type OAuthConnection,
} from "@arkham-build/shared";
import { CheckIcon, CloudOffIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SteamIcon } from "@/components/icons/steam-icon";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast.hooks";
import { useDisconnectOAuthIdentityMutation } from "@/queries/mutations/auth";
import { useStore } from "@/store";
import { selectSession } from "@/store/selectors/auth";
import { formatDateTime } from "@/utils/formatting";
import css from "./connections.module.css";
import { Section } from "./section";

export function OAuthConnections() {
  const { t } = useTranslation();

  return (
    <Section title={t("settings.account.oauth.title")}>
      {OAUTH_CONNECTIONS.map((connection) => (
        <OAuthConnectionCard
          connection={connection}
          key={connection.provider}
        />
      ))}
    </Section>
  );
}

export function OAuthConnectionCard(props: {
  connection: OAuthConnection;
  returnTo?: string;
  variant?: "default" | "onboarding";
}) {
  const { connection, returnTo, variant = "default" } = props;
  const { i18n, t } = useTranslation();
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
  const canDisconnect = identity ? isDisconnectable(identity) : false;
  const connectHref = getOAuthConnectHref(connection, returnTo);
  const isOnboarding = variant === "onboarding";
  const status = getConnectionStatus(identity);
  const statusProps =
    status === "connected"
      ? {
          color: "var(--color-success)",
          icon: <CheckIcon />,
          label: t("settings.account.oauth.connected"),
        }
      : {
          color: "var(--nord-11)",
          icon: <CloudOffIcon />,
          label: t("settings.account.oauth.disconnected"),
        };

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
    <article className={css["connection"]}>
      <header className={css["header"]}>
        <h3 className={css["title"]}>
          <ConnectionIcon connection={connection} />
          {providerName}
        </h3>
        {isConnected && (
          <StatusPill
            color={statusProps.color}
            icon={statusProps.icon}
            testId="connection-status"
          >
            {statusProps.label}
          </StatusPill>
        )}
      </header>
      <div className={css["content"]}>
        {isConnected ? (
          <>
            <ConnectionDetails identity={identity} />
            {!isOnboarding && (
              <div className={css.actions}>
                <Button
                  as="a"
                  disabled={disconnectOAuthIdentityMutation.isPending}
                  href={connectHref}
                  variant="secondary"
                >
                  {t("settings.account.oauth.reconnect")}
                </Button>
                <Button
                  disabled={
                    disconnectOAuthIdentityMutation.isPending || !canDisconnect
                  }
                  onClick={onDisconnect}
                  variant="secondary"
                >
                  {t("settings.account.oauth.disconnect")}
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <p>{getConnectionHelp(t, i18n, connection, providerName)}</p>
            <div className={css.actions}>
              <Button
                as="a"
                disabled={disconnectOAuthIdentityMutation.isPending}
                href={connectHref}
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

  if (isSteamIdentity(identity)) {
    return <SteamConnectionDetails identity={identity} />;
  }

  if (!isArkhamDBIdentity(identity)) return null;

  return (
    <details className={css["details"]}>
      <summary>{t("settings.account.oauth.details")}</summary>
      <dl className={css["details-properties"]}>
        {identity.details.username && (
          <>
            <dt>
              {t("settings.account.oauth.providers.arkhamdb")}{" "}
              {t("settings.account.profile.username")}
            </dt>
            <dd>{identity.details.username}</dd>
          </>
        )}
        {identity.providerUserId && (
          <>
            <dt>{t("settings.account.oauth.user_id")}</dt>
            <dd>{identity.providerUserId}</dd>
          </>
        )}
        <dt>{t("settings.account.oauth.sync_status")}</dt>
        <dd>{t(`settings.account.oauth.status.${identity.details.status}`)}</dd>
        <dt>{t("settings.account.oauth.last_synced_at")}</dt>
        <dd>
          {identity.details.lastSyncedAt
            ? formatDateTime(identity.details.lastSyncedAt)
            : t("settings.account.oauth.none")}
        </dd>
        <dt>{t("settings.account.oauth.last_error")}</dt>
        <dd>
          {identity.details.lastError ?? t("settings.account.oauth.none")}
        </dd>
      </dl>
    </details>
  );
}

function SteamConnectionDetails({
  identity,
}: {
  identity: Extract<Identity, { provider: "steam" }>;
}) {
  const { t } = useTranslation();

  return (
    <div className={css["steam-profile-card"]}>
      <img
        alt={t("settings.account.oauth.avatar")}
        className={css["steam-profile-avatar"]}
        src={identity.details.avatarUrl}
      />
      <div className={css["steam-profile-body"]}>
        <a
          className={css["steam-profile-name"]}
          href={identity.details.profileUrl}
          rel="noreferrer"
          target="_blank"
        >
          {identity.details.displayName}
        </a>
        <div className={css["steam-profile-id"]}>
          <span>{t("settings.account.oauth.user_id")}</span>
          <code>{identity.providerUserId}</code>
        </div>
      </div>
    </div>
  );
}

function ConnectionIcon({ connection }: { connection: OAuthConnection }) {
  if (connection.provider === "steam") {
    return <SteamIcon className={css["provider-icon"]} />;
  }

  return <i className={connection.icon} />;
}

type ConnectionStatus = "connected" | "disconnected";

function isDisconnectable(identity: Identity) {
  return "canDisconnect" in identity && identity.canDisconnect;
}

function getConnectionStatus(identity: Identity | undefined): ConnectionStatus {
  if (!identity) {
    return "disconnected";
  }

  if (isArkhamDBIdentity(identity) && identity.details.status !== "healthy") {
    return "disconnected";
  }

  return "connected";
}

function getConnectionHelp(
  t: ReturnType<typeof useTranslation>["t"],
  i18n: ReturnType<typeof useTranslation>["i18n"],
  connection: OAuthConnection,
  providerName: string,
) {
  const providerKey = `settings.account.oauth.connect_help_${connection.provider}`;

  return t(
    i18n.exists(providerKey)
      ? providerKey
      : "settings.account.oauth.connect_help",
    { provider: providerName },
  );
}

function getOAuthConnectHref(
  connection: OAuthConnection,
  returnTo: string | undefined,
) {
  const path = `${import.meta.env.VITE_API_URL}/auth/${connection.provider}/connect`;

  if (!returnTo) {
    return path;
  }

  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}
