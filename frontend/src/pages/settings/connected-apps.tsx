import type { OAuthGrant } from "@arkham-build/shared";
import { CheckIcon, CloudOffIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Notice } from "@/components/ui/notice";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast.hooks";
import { useRevokeOAuthGrantMutation } from "@/queries/mutations/oauth-grants";
import { useOAuthGrantsQuery } from "@/queries/oauth-grants";
import { formatDate } from "@/utils/formatting";
import { OAUTH_SCOPE_TRANSLATION_KEYS } from "@/utils/oauth-scopes";
import css from "./connections.module.css";

type ConnectedAppsViewProps =
  | { state: "loading" }
  | { state: "error" }
  | {
      grants: OAuthGrant[];
      onDisconnect: (grant: OAuthGrant) => Promise<void>;
      pendingClientId?: string;
      state: "ready";
    };

function ConnectedAppsView(props: ConnectedAppsViewProps) {
  const { t } = useTranslation();

  if (props.state === "loading") {
    return (
      <div data-testid="connected-apps-loading">
        <Loader message={t("settings.account.connected_apps.loading")} show />
      </div>
    );
  }

  if (props.state === "error") {
    return (
      <Notice variant="warning">
        <p data-testid="connected-apps-error">
          {t("settings.account.connected_apps.error")}
        </p>
      </Notice>
    );
  }

  if (props.grants.length === 0) return null;

  return (
    <div className={css["apps"]} data-testid="connected-apps-ready">
      {props.grants.map((grant) => (
        <ConnectedAppCard
          grant={grant}
          key={grant.client.id}
          onDisconnect={props.onDisconnect}
          pendingClientId={props.pendingClientId}
        />
      ))}
    </div>
  );
}

function ConnectedAppCard({
  grant,
  onDisconnect,
  pendingClientId,
}: {
  grant: OAuthGrant;
  onDisconnect: (grant: OAuthGrant) => Promise<void>;
  pendingClientId?: string;
}) {
  const { t } = useTranslation();
  const disabled = grant.client.status === "disabled";

  return (
    <article className={css["connection"]}>
      <header className={css["header"]}>
        <h3 className={css["title"]}>{grant.client.name}</h3>
        <StatusPill
          color={disabled ? "var(--color-error)" : "var(--color-success)"}
          icon={disabled ? <CloudOffIcon /> : <CheckIcon />}
          testId="connected-app-status"
        >
          {t(`settings.account.connected_apps.status.${grant.client.status}`)}
        </StatusPill>
      </header>

      <div className={css["content"]}>
        <details className={css["details"]}>
          <summary>{t("settings.account.oauth.details")}</summary>
          <dl className={css["details-properties"]}>
            <dt>{t("settings.account.connected_apps.permissions")}</dt>
            <dd>
              <ul className={css["scopes"]}>
                {grant.scopes.map((scope) => (
                  <li key={scope}>
                    {t(OAUTH_SCOPE_TRANSLATION_KEYS[scope].title)}
                  </li>
                ))}
              </ul>
            </dd>
            <dt>{t("settings.account.connected_apps.granted_at")}</dt>
            <dd>
              <time dateTime={grant.grantedAt}>
                {formatDate(grant.grantedAt)}
              </time>
            </dd>
            <dt>{t("settings.account.connected_apps.last_authorized_at")}</dt>
            <dd>
              <time dateTime={grant.lastAuthorizedAt}>
                {formatDate(grant.lastAuthorizedAt)}
              </time>
            </dd>
          </dl>
        </details>

        <div className={css["actions"]}>
          <Button
            disabled={pendingClientId != null}
            onClick={async () => await onDisconnect(grant)}
            variant="secondary"
          >
            {t("settings.account.oauth.disconnect")}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function ConnectedApps() {
  const { t } = useTranslation();
  const toast = useToast();
  const grantsQuery = useOAuthGrantsQuery();
  const revokeMutation = useRevokeOAuthGrantMutation();

  const onDisconnect = async (grant: OAuthGrant) => {
    if (
      !globalThis.confirm(
        t("settings.account.connected_apps.revoke_confirm", {
          clientName: grant.client.name,
        }),
      )
    ) {
      return;
    }

    const toastId = toast.show({
      children: t("settings.account.connected_apps.revoking_app", {
        clientName: grant.client.name,
      }),
      variant: "loading",
    });

    try {
      await revokeMutation.mutateAsync(grant.client.id);
      toast.dismiss(toastId);
    } catch (error) {
      toast.dismiss(toastId);
      toast.show({
        children: t("settings.account.connected_apps.revoke_error", {
          clientName: grant.client.name,
          error: error instanceof Error ? error.message : String(error),
        }),
        variant: "error",
      });
    }
  };

  if (grantsQuery.isPending) {
    return <ConnectedAppsView state="loading" />;
  }

  if (grantsQuery.isError) {
    return <ConnectedAppsView state="error" />;
  }

  return (
    <ConnectedAppsView
      grants={grantsQuery.data.grants}
      onDisconnect={onDisconnect}
      pendingClientId={
        revokeMutation.isPending ? revokeMutation.variables : undefined
      }
      state="ready"
    />
  );
}
