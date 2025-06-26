import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearch } from "wouter";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/components/ui/toast.hooks";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import { useSync } from "@/store/hooks/use-sync";
import type { Provider } from "@/store/slices/connections.types";
import { formatProviderName } from "@/utils/formatting";

export function Connect() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const toast = useToast();
  const { t } = useTranslation();

  const params = new URLSearchParams(search);

  const createConnection = useStore((state) => state.createConnection);
  const sync = useSync();

  const provider = params.get("provider")?.toString() || "arkhamdb";
  const loginState = params.get("login_state")?.toString();
  const error = params.get("error")?.toString();

  const lock = useRef(false);

  useEffect(() => {
    async function initializeConnection() {
      if (lock.current) return;

      try {
        if (loginState === "success") {
          const connections = await createConnection(provider as Provider, {});
          lock.current = true;
          await sync(connections);
        } else {
          toast.show({
            children: t("connect.error", { error: error || "Unknown error" }),
            variant: "error",
          });
        }
      } finally {
        navigate(`~/settings?${search}`, { replace: true });
      }
    }

    initializeConnection().catch(console.error);
  }, [
    loginState,
    error,
    toast,
    navigate,
    createConnection,
    provider,
    search,
    sync,
    t,
  ]);

  const providerName = formatProviderName(provider);

  const message = lock
    ? t("connect.syncing", { provider: providerName })
    : t("connect.title", { provider: providerName });

  return (
    <AppLayout title={t("connect.title", { provider: providerName })}>
      <Loader show message={message} />
    </AppLayout>
  );
}
