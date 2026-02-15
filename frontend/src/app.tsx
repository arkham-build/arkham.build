import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Route, Router, Switch, useLocation, useSearch } from "wouter";
import { useBrowserLocation } from "wouter/use-browser-location";
import { ErrorBoundary } from "./components/error-boundary";
import { Loader } from "./components/ui/loader";
import { ToastProvider } from "./components/ui/toast";
import { useToast } from "./components/ui/toast.hooks";
import { Connect } from "./pages/connect/connect";
import { ErrorStatus } from "./pages/errors/404";
import { useStore } from "./store";
import { shouldAutoSync, useSync } from "./store/hooks/use-sync";
import { selectIsInitialized } from "./store/selectors/shared";
import {
  queryCards,
  queryDataVersion,
  queryMetadata,
} from "./store/services/queries";
import { useAgathaEasterEggHint } from "./utils/easter-egg-agatha";
import { useColorThemeListener } from "./utils/use-color-theme";

const Index = lazy(() => import("./pages/index"));

const Browse = lazy(() =>
  import("./pages/browse/index").then((m) => ({ default: m.Browse })),
);

const BrowsePack = lazy(() =>
  import("./pages/browse/index").then((m) => ({ default: m.BrowsePack })),
);

const BrowseCycle = lazy(() =>
  import("./pages/browse/index").then((m) => ({ default: m.BrowseCycle })),
);

const BrowseEncounterSet = lazy(() =>
  import("./pages/browse/index").then((m) => ({
    default: m.BrowseEncounterSet,
  })),
);

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

const FanMadeContentPreview = lazy(
  () => import("./pages/fan-made-content-preview/fan-made-content-preview"),
);

function App() {
  return (
    <Providers>
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

function Providers(props: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense>
          <ToastProvider>{props.children}</ToastProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
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
      <Suspense fallback={<Loader delay={200} show />}>
        {storeInitialized && (
          <Router hook={useBrowserLocation}>
            <Switch>
              <Route component={Index} path="/" />
              <Route component={Browse} path="/browse" />
              <Route component={BrowsePack} path="/browse/pack/:pack_code" />
              <Route component={BrowseCycle} path="/browse/cycle/:cycle_code" />
              <Route
                component={BrowseEncounterSet}
                path="/browse/encounter_set/:encounter_code"
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
              <Route component={Share} path="/share/:id" />
              <Route component={CollectionStats} path="/collection-stats" />
              <Route component={BrowseDecklists} path="/decklists" />
              <Route component={Connect} path="/connect" />
              <Route component={Rules} path="/rules" />
              <Route component={Core2026Reveal} path="/blog/core-2026-reveal" />
              <Route
                component={FanMadeContentPreview}
                path="/fan-made-content/preview/:id"
              />
              <Route
                component={InstallFanMadeContent}
                path="/install-fan-made-content"
              />
              <Route path="*">
                <ErrorStatus statusCode={404} />
              </Route>
            </Switch>
            <RouteReset />
            <CardDataSyncTask />
            <AppTasks />
          </Router>
        )}
      </Suspense>
    </>
  );
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: a change to pathname indicates a change to window.location.
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
  const toastId = useRef<string | undefined>();

  const shouldQueryDataVersion =
    !navigator.webdriver && !location.includes("/connect");

  const { data: remoteDataVersion } = useQuery({
    enabled: shouldQueryDataVersion,
    queryFn: () => queryDataVersion(locale),
    queryKey: ["tasks", "dataVersion", locale],
    staleTime: 24 * 60 * 60 * 1000,
  });

  const init = useStore((state) => state.init);
  const settings = useStore((state) => state.settings);

  const initMutation = useMutation({
    mutationFn: () =>
      init(queryMetadata, queryDataVersion, queryCards, {
        refresh: true,
        locale: settings.locale,
      }),
  });

  useEffect(() => {
    if (
      !remoteDataVersion ||
      !dataVersion ||
      initMutation.isPending ||
      initMutation.isError
    ) {
      return;
    }

    const upToDate =
      remoteDataVersion.locale === dataVersion.locale &&
      remoteDataVersion.cards_updated_at === dataVersion.cards_updated_at &&
      remoteDataVersion.translation_updated_at ===
        dataVersion.translation_updated_at &&
      remoteDataVersion.version === dataVersion.version;

    if (!upToDate) {
      toastId.current = toast.show({
        variant: "loading",
        children: t("settings.card_data.loading"),
      });

      initMutation
        .mutateAsync()
        .then(() => {
          if (toastId.current) {
            toast.dismiss(toastId.current);
          }
        })
        .catch(console.error);
    }
  }, [
    dataVersion,
    initMutation.isError,
    initMutation.isPending,
    initMutation.mutateAsync,
    remoteDataVersion,
    toast,
    t,
  ]);

  return null;
}

function AppTasks() {
  const connections = useStore((state) => state.connections);

  const sync = useSync();
  const [location] = useLocation();

  useAgathaEasterEggHint();

  const autoSyncLock = useRef(false);

  useEffect(() => {
    if (!autoSyncLock.current && shouldAutoSync(location, connections)) {
      autoSyncLock.current = true;
      sync().catch(console.error);
    }
  }, [sync, location, connections]);

  return null;
}

export default App;
