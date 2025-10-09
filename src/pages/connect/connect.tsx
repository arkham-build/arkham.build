import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearch } from "wouter";
import { Loader } from "@/components/ui/loader";
import { AppLayout } from "@/layouts/app-layout";
import { useSync } from "@/store/hooks/use-sync";
import type { Provider } from "@/store/slices/connections.types";
import type { StorageProvider } from "@/utils/constants";
import { cx } from "@/utils/cx";
import { formatProviderName } from "@/utils/formatting";
import { ErrorDisplay } from "../../components/error-display/error-display";
import css from "./connect.module.css";

export function Connect() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { t } = useTranslation();

  const connectLock = useRef(false);
  const sync = useSync();

  const params = new URLSearchParams(search);
  const loginState = params.get("login_state")?.toString();

  const error = params.get("error")?.toString();
  const provider = params.get("provider")?.toString() || "arkhamdb";
  const providerName = formatProviderName(provider as StorageProvider);

  useEffect(() => {
    if (connectLock.current) return;
    connectLock.current = true;

    async function syncOnConnect() {
      if (loginState === "success") {
        await sync({ provider: provider as Provider, user: {} });
        navigate(`~/settings?${search}`, { replace: true });
      }
    }

    syncOnConnect().catch(console.error);
  }, [loginState, provider, sync, search, navigate]);

  const message =
    loginState === "success"
      ? t("connect.title", { provider: providerName })
      : t("connect.error", {
          error: error || "Unknown error",
          provider: providerName,
        });

  return (
    <AppLayout
      mainClassName={css["connect"]}
      title={t("connect.title", { provider: providerName })}
    >
      {loginState === "success" ? (
        <Loader show message={message} />
      ) : (
        <ErrorDisplay
          status={500}
          pre={
            <i
              className={cx(css["connect-icon"], "icon-current icon-auto_fail")}
            />
          }
          message={message}
        />
      )}
    </AppLayout>
  );
}
