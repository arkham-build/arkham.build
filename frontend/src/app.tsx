import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Redirect,
  Route,
  Router,
  Switch,
  useLocation,
  useSearch,
} from "wouter";
import { useBrowserLocation } from "wouter/use-browser-location";
import { ErrorBoundary } from "./components/error-boundary";
import { KeyboardShortcutsModal } from "./components/keyboard-shortcuts/keyboard-shortcuts-modal";
import { Loader } from "./components/ui/loader";
import { ToastProvider } from "./components/ui/toast";
import { useToast } from "./components/ui/toast.hooks";
import { ErrorStatus } from "./pages/errors/404";
import {
  useDataVersionQuery,
  useRefreshMetadataMutation,
} from "./queries/cache";
import { useStore } from "./store";
import { selectSession } from "./store/selectors/auth";
import { selectIsInitialized } from "./store/selectors/shared";
import type { HttpClient } from "./store/services/http-client";
import { HttpClientProvider } from "./store/services/http-client.provider";
import { useAgathaEasterEggHint } from "./utils/easter-egg-agatha";
import { useColorThemeListener } from "./utils/use-color-theme";

const Index = lazy(() => import("./pages/index"));

const AccountMigration = lazy(
  () => import("./pages/account-migration/account-migration"),
);

const BrowseRoutes = lazy(() => import("./pages/browse/index"));

const DeckEdit = lazy(() => import("./pages/deck-edit/deck-edit"));

const ChooseInvestigator = lazy(
  () => import("./pages/choose-investigator/choose-investigator"),
);

const DeckCreate = lazy(() => import("./pages/deck-create/deck-create"));

const DeckView = lazy(() => import("./pages/deck-view/deck-view"));

const Settings = lazy(() => import("./pages/settings/settings"));

const CardView = lazy(() => import("./pages/card-view/card-view"));

const CardViewUsable = lazy(() => import("./pages/card-view/usable-cards"));

const About = lazy(() => import("./pages/about/about"));

const Privacy = lazy(() => import("./pages/legal/privacy"));

const Terms = lazy(() => import("./pages/legal/terms"));

const LegalNotice = lazy(() => import("./pages/legal/legal-notice"));

const Share = lazy(() => import("./pages/share/share"));

const Search = lazy(() => import("./pages/search/search"));

const CollectionStats = lazy(
  () => import("./pages/collection-stats/collection-stats"),
);

const BrowseDecklists = lazy(
  () => import("./pages/browse-decklists/browse-decklists"),
);

const Rules = lazy(() => import("./pages/rules-reference/rules-reference"));

const InstallFanMadeContent = lazy(
  () => import("./pages/install-fan-made-content/install-fan-made-content"),
);

const Core2026Reveal = lazy(() => import("./pages/blog/core-2026-reveal"));

const Investigator2026Reveal = lazy(
  () => import("./pages/blog/investigator-2026-reveal"),
);

const FanMadeContentPreview = lazy(
  () => import("./pages/fan-made-content-preview/fan-made-content-preview"),
);
const Login = lazy(() => import("./pages/auth/login"));
const Signup = lazy(() => import("./pages/auth/signup"));
const CompleteSignup = lazy(() => import("./pages/auth/complete-signup"));
const ForgotPassword = lazy(() => import("./pages/auth/forgot-password"));
const VerifyEmail = lazy(() => import("./pages/auth/verify-email"));
const ResetPassword = lazy(() => import("./pages/auth/reset-password"));

function App(props: { httpClient: HttpClient }) {
  return (
    <Providers httpClient={props.httpClient}>
      <AppInner />
    </Providers>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Providers(props: {
  children: React.ReactNode;
  httpClient: HttpClient;
}) {
  return (
    <HttpClientProvider client={props.httpClient}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense>
            <ToastProvider>{props.children}</ToastProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>
    </HttpClientProvider>
  );
}

function AppInner() {
  const { t } = useTranslation();
  const storeInitialized = useStore(selectIsInitialized);
  const fontSize = useStore((state) => state.settings.fontSize);
  useColorThemeListener();

  useEffect(() => {
    if (storeInitialized) {
      document.documentElement.style.fontSize = `${fontSize}%`;
    }
  }, [storeInitialized, fontSize]);

  return (
    <>
      <Loader message={t("app.init")} show={!storeInitialized} delay={200} />
      <Suspense fallback={<Loader delay={300} show />}>
        {storeInitialized && (
          <Router hook={useBrowserLocation}>
            <AccountMigrationRouteGuard>
              <ProfileCompletionRouteGuard>
                <Switch>
                  <Route component={Index} path="/" />
                  <Route
                    component={AccountMigration}
                    path="/account-migration"
                  />
                  <Route
                    component={BrowseRoutes}
                    path={/^\/browse(?:\/.*)?$/}
                  />
                  <Route component={Search} path="/search" />
                  <Route component={CardView} path="/card/:code" />
                  <Route
                    component={CardViewUsable}
                    path="/card/:code/usable_cards"
                  />
                  <Route component={ChooseInvestigator} path="/deck/create" />
                  <Route component={DeckCreate} path="/deck/create/:code" />
                  <Route component={DeckView} path="/:type/view/:id" />
                  <Route component={DeckView} path="/:type/view/:id/:slug" />
                  <Route component={DeckEdit} nest path="/deck/edit/:id" />
                  <Route component={Settings} path="/settings" />
                  <Route component={About} path="/about" />
                  <Route component={Privacy} path="/privacy" />
                  <Route component={Terms} path="/terms" />
                  <Route component={LegalNotice} path="/legal-notice" />
                  <Route component={Share} path="/share/:id" />
                  <Route component={CollectionStats} path="/collection-stats" />
                  <Route component={BrowseDecklists} path="/decklists" />
                  <Route component={Rules} path="/rules" />
                  <Route
                    component={Core2026Reveal}
                    path="/blog/core-2026-reveal"
                  />
                  <Route
                    component={Investigator2026Reveal}
                    path="/blog/investigator-2026-reveal"
                  />
                  <Route
                    component={FanMadeContentPreview}
                    path="/fan-made-content/preview/:id"
                  />
                  <Route
                    component={InstallFanMadeContent}
                    path="/install-fan-made-content"
                  />
                  <Route component={Login} path="/auth/login" />
                  <Route component={Signup} path="/auth/signup" />
                  <Route
                    component={CompleteSignup}
                    path="/auth/signup/complete"
                  />
                  <Route
                    component={ForgotPassword}
                    path="/auth/forgot-password"
                  />
                  <Route component={VerifyEmail} path="/auth/verify-email" />
                  <Route
                    component={ResetPassword}
                    path="/auth/reset-password"
                  />
                  <Route path="*">
                    <ErrorStatus statusCode={404} />
                  </Route>
                </Switch>
              </ProfileCompletionRouteGuard>
            </AccountMigrationRouteGuard>
            <RouteReset />
            <CardDataSyncTask />
            <AppTasks />
            <KeyboardShortcutsModal />
          </Router>
        )}
      </Suspense>
    </>
  );
}

function AccountMigrationRouteGuard(props: { children: React.ReactNode }) {
  const migrationNeeded = useStore(
    (state) => state.settings.flags?.migrationNeeded === true,
  );
  const [pathname] = useLocation();

  if (migrationNeeded && pathname !== "/account-migration") {
    return <Redirect to="/account-migration" />;
  }

  return props.children;
}

function ProfileCompletionRouteGuard(props: { children: React.ReactNode }) {
  const authStatus = useStore((state) => state.auth.status);
  const session = useStore(selectSession);
  const [pathname] = useLocation();

  if (
    authStatus === "authenticated" &&
    session &&
    !session.account.profileComplete &&
    pathname !== "/auth/signup/complete" &&
    pathname !== "/account-migration"
  ) {
    return <Redirect to="/auth/signup/complete" />;
  }

  return props.children;
}

function RouteReset() {
  const pushHistory = useStore((state) => state.pushHistory);
  const closeCardModal = useStore((state) => state.closeCardModal);

  const [pathname] = useLocation();
  const search = useSearch();

  useEffect(() => {
    pushHistory(pathname + (search ? `?${search}` : ""));
    closeCardModal();
  }, [pathname, search, pushHistory, closeCardModal]);

  useEffect(() => {
    try {
      if (window.location.hash) {
        // HACK: this enables hash-based deep links to work when a route is loaded async.
        const el = document.querySelector(window.location.hash);

        if (el) {
          el.scrollIntoView();
          return;
        }
      }

      window.scrollTo(0, 0);
    } catch (_) {}
  }, [pathname]);

  return null;
}

function CardDataSyncTask() {
  const [location] = useLocation();
  const locale = useStore((state) => state.settings.locale);
  const dataVersion = useStore((state) => state.metadata.dataVersion);

  const { t } = useTranslation();

  const toast = useToast();
  const toastId = useRef<string | undefined>(undefined);
  const hasTriggeredSync = useRef(false);

  const shouldQueryDataVersion =
    !navigator.webdriver && !location.includes("/connect");

  const { data: remoteDataVersion } = useDataVersionQuery(
    locale,
    shouldQueryDataVersion,
  );

  const refreshMetadataMutation = useRefreshMetadataMutation();

  useEffect(() => {
    if (
      hasTriggeredSync.current ||
      !remoteDataVersion ||
      !dataVersion ||
      refreshMetadataMutation.isPending ||
      refreshMetadataMutation.isError
    ) {
      return;
    }

    const upToDate =
      remoteDataVersion.locale === dataVersion.locale &&
      remoteDataVersion.cards_updated_at === dataVersion.cards_updated_at &&
      remoteDataVersion.metadata_version === dataVersion.metadata_version &&
      remoteDataVersion.translation_updated_at ===
        dataVersion.translation_updated_at;

    if (!upToDate) {
      hasTriggeredSync.current = true;
      toastId.current = toast.show({
        variant: "loading",
        children: t("settings.card_data.loading"),
      });

      refreshMetadataMutation
        .mutateAsync()
        .then(() => {
          if (toastId.current) {
            toast.dismiss(toastId.current);
          }
        })
        .catch(console.error);
    }
  }, [dataVersion, refreshMetadataMutation, remoteDataVersion, toast, t]);

  return null;
}

function AppTasks() {
  useAgathaEasterEggHint();

  return (
    <>
      <OAuthErrorToastTask />
      <SettingsSyncErrorTask />
    </>
  );
}

function OAuthErrorToastTask() {
  const { i18n, t } = useTranslation();
  const toast = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("oauth_error");

    if (!oauthError) {
      return;
    }

    params.delete("oauth_error");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);

    const translationKey = `auth.oauth_errors.${oauthError}`;

    toast.show({
      children: t(
        i18n.exists(translationKey)
          ? translationKey
          : "auth.oauth_errors.oauth_failed",
      ),
      variant: "error",
    });
  }, [i18n, t, toast]);

  return null;
}

function SettingsSyncErrorTask() {
  const { t } = useTranslation();
  const toast = useToast();
  const { error, status } = useStore((state) => state.sync.settings);

  const previousSettingsSyncStatus = useRef(status);

  useEffect(() => {
    if (
      previousSettingsSyncStatus.current === "loading" &&
      status === "error" &&
      error
    ) {
      toast.show({
        children: t("settings.load_error", { error }),
        variant: "error",
      });
    }

    previousSettingsSyncStatus.current = status;
  }, [error, status, t, toast]);

  return null;
}

export default App;
