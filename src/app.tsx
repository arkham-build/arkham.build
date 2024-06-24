import { Suspense, lazy, useEffect } from "react";
import { Route, Router, Switch, useLocation } from "wouter";
import { useBrowserLocation } from "wouter/use-browser-location";

import { ErrorBoundary } from "./components/error-boundary";
import { Loader } from "./components/ui/loader";
import { ToastProvider } from "./components/ui/toast";
import { Error404 } from "./pages/errors/404";
import { useStore } from "./store";
import { selectIsInitialized } from "./store/selectors/shared";
import {
  queryCards,
  queryDataVersion,
  queryMetadata,
} from "./store/services/queries";

const Browse = lazy(() => import("./pages/browse/browse"));
const DeckEdit = lazy(() => import("./pages/deck-edit/deck-edit"));
const ChooseInvestigator = lazy(
  () => import("./pages/choose-investigator/choose-investigator"),
);
const DeckCreate = lazy(() => import("./pages/deck-create/deck-create"));
const DeckView = lazy(() => import("./pages/deck-view/deck-view"));
const Settings = lazy(() => import("./pages/settings/settings"));
const CardView = lazy(() => import("./pages/card-view/card-view"));
const About = lazy(() => import("./pages/about/about"));

function App() {
  const storeHydrated = useStore((state) => state.ui.hydrated);
  const storeInitialized = useStore(selectIsInitialized);
  const init = useStore((state) => state.init);

  useEffect(() => {
    if (storeHydrated)
      init(queryMetadata, queryDataVersion, queryCards, false).catch(
        console.error,
      );
  }, [storeHydrated, init]);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Loader
          message="Initializing card database..."
          show={storeHydrated && !storeInitialized}
        />
        <Suspense fallback={<Loader delay={200} show />}>
          {storeInitialized && (
            <Router hook={useBrowserLocation}>
              <Switch>
                <Route component={Browse} path="/" />
                <Route component={CardView} path="/card/:code" />
                <Route component={ChooseInvestigator} path="/deck/create" />
                <Route component={DeckCreate} path="/deck/create/:code" />
                <Route component={DeckView} path="/deck/view/:id" />
                <Route component={DeckEdit} path="/deck/edit/:id" />
                <Route component={Settings} path="/settings" />
                <Route component={About} path="/about" />
                <Route component={Error404} path="*" />
              </Switch>
              <RouteReset />
            </Router>
          )}
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
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

export default App;
