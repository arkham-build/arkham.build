import { Suspense, lazy, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Route, Router, Switch, useLocation } from "wouter";
import { useBrowserLocation } from "wouter/use-browser-location";
import lovecrafter from "../content/lovecrafter.json";
import { ErrorBoundary } from "./components/error-boundary";
import { Loader } from "./components/ui/loader";
import { ToastProvider } from "./components/ui/toast";
import { useToast } from "./components/ui/toast.hooks";
import { Connect } from "./pages/connect/connect";
import { Error404 } from "./pages/errors/404";
import { CardDataSync } from "./pages/settings/card-data-sync";
import { useStore } from "./store";
import { useSync } from "./store/hooks/use-sync";
import { selectIsInitialized } from "./store/selectors/shared";
import {
  queryCards,
  queryDataVersion,
  queryMetadata,
} from "./store/services/queries";
import { useAgathaEasterEggHint } from "./utils/easter-egg-agatha";
import { useColorTheme } from "./utils/use-color-theme";
import { useVisibilityChange } from "./utils/use-document-visibility";

const Browse = lazy(() => import("./pages/browse/browse"));
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
const CollectionStats = lazy(
  () => import("./pages/collection-stats/collection-stats"),
);

function App() {
  return (
    <Providers>
      <AppInner />
    </Providers>
  );
}

function Providers(props: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>{props.children}</ToastProvider>
    </ErrorBoundary>
  );
}

function AppInner() {
  const { t } = useTranslation();
  const toast = useToast();
  const storeInitialized = useStore(selectIsInitialized);
  const settings = useStore((state) => state.settings);
  const init = useStore((state) => state.init);
  const addCustomProject = useStore((state) => state.addCustomProject);
  const removeCustomProject = useStore((state) => state.removeCustomProject);

  useColorTheme();

  // !!!HACK!!!
  // part of the ~~hack~~ workaround for https://github.com/radix-ui/primitives/issues/2777 / https://bugzilla.mozilla.org/show_bug.cgi?id=1885232.
  // make sure pointer events are re-enabled when the tab is focused - we disable them on pointerdown for slider and scrollarea
  // and changing the tab while the pointer is down will leave the page in a state where pointer events are disabled.
  // FIXME: remove this when Firefox fixes this bug, alongside the package patches.
  useVisibilityChange(() => {
    document.body.style.pointerEvents = "auto";
  });

  useEffect(() => {
    async function initStore() {
      try {
        await init(queryMetadata, queryDataVersion, queryCards, false);
        await removeCustomProject(lovecrafter.meta.code);
        await addCustomProject(lovecrafter);
      } catch (err) {
        console.error(err);
        toast.show({
          children: t("app.init_error", {
            error: (err as Error)?.message ?? "Unknown error",
          }),
          variant: "error",
        });
      }
    }

    initStore();
  }, [init, toast.show, t, addCustomProject, removeCustomProject]);

  useEffect(() => {
    if (storeInitialized) {
      document.documentElement.style.fontSize = `${settings.fontSize}%`;
    }
  }, [storeInitialized, settings.fontSize]);

  return (
    <>
      <Loader message={t("app.init")} show={!storeInitialized} delay={200} />
      <Suspense fallback={<Loader delay={200} show />}>
        {storeInitialized && (
          <Router hook={useBrowserLocation}>
            <Switch>
              <Route component={Browse} path="/" />
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
              <Route component={Connect} path="/connect" />
              <Route component={Error404} path="*" />
            </Switch>
            <RouteReset />
            <AppTasks />
          </Router>
        )}
      </Suspense>
    </>
  );
}

function RouteReset() {
  const [pathname] = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: a change to pathname indicates a change to window.location.
  useEffect(() => {
    if (window.location.hash) {
      // HACK: this enables hash-based deep links to work when a route is loaded async.
      const el = document.querySelector(window.location.hash);

      if (el) {
        el.scrollIntoView();
        return;
      }
    }

    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppTasks() {
  const dataVersion = useStore((state) => state.metadata.dataVersion);
  const connections = useStore((state) => state.connections);

  const sync = useSync();
  const toast = useToast();
  const [location] = useLocation();
  const toastId = useRef<string>();

  useAgathaEasterEggHint();

  const cardDataLock = useRef(false);

  useEffect(() => {
    async function updateCardData() {
      if (cardDataLock.current) return;
      cardDataLock.current = true;

      const data = await queryDataVersion();

      const upToDate =
        data &&
        dataVersion &&
        data.cards_updated_at === dataVersion.cards_updated_at;

      if (!upToDate && !toastId.current) {
        toastId.current = toast.show({
          children: (
            <div>
              <CardDataSync
                onSyncComplete={() => {
                  if (toastId.current) {
                    toast.dismiss(toastId.current);
                    toastId.current = undefined;
                  }
                }}
              />
            </div>
          ),
          persistent: true,
        });
      }
    }

    if (
      location !== "/settings" &&
      location !== "/connect" &&
      !cardDataLock.current
    ) {
      updateCardData().catch(console.error);
    }
  }, [dataVersion, toast.dismiss, toast.show, location]);

  const autoSyncLock = useRef(false);

  useEffect(() => {
    const lastSyncedAt = connections.lastSyncedAt;
    if (
      location !== "/settings" &&
      location !== "/connect" &&
      (!lastSyncedAt || Date.now() - lastSyncedAt > 30 * 60 * 1000) &&
      !autoSyncLock.current
    ) {
      autoSyncLock.current = true;
      sync(connections).catch(console.error);
    }
  }, [sync, location, connections]);

  return null;
}

export default App;
