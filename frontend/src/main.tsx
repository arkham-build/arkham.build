import "./styles/main.css";
import "@fontsource-variable/noto-sans/standard.css";
import "@fontsource-variable/noto-sans/standard-italic.css";
import "@fontsource-variable/noto-serif/standard.css";
import "@fontsource-variable/noto-serif/standard-italic.css";
import "./styles/icons-encounters.css";
import "./styles/icons-icon.css";

import React from "react";
import ReactDOM from "react-dom/client";
import i18n from "@/utils/i18n";
import App from "./app";
import { useStore } from "./store";
import { tabSync } from "./store/persist";
import type { TabSyncEvent } from "./store/persist/tab-sync";
import { createHttpClient } from "./store/services/http-client";
import {
  queryCards,
  queryDataVersion,
  queryMetadata,
} from "./store/services/requests/cache";

const rootNode = document.getElementById("root");

if (!rootNode) {
  throw new Error("fatal: did not find root node in DOM.");
}

const httpClient = createHttpClient({
  apiUrl: import.meta.env.VITE_API_URL,
  onUnauthorized: () => useStore.getState().handleUnauthorized(),
});

ReactDOM.createRoot(rootNode).render(
  <React.StrictMode>
    <App httpClient={httpClient} />
  </React.StrictMode>,
);

init().catch((err) => {
  console.error(err);
  alert(
    i18n.t("app.init_error", {
      error: (err as Error)?.message ?? "Unknown error",
    }),
  );
});

async function init() {
  const store = useStore.getState();

  await store.init(
    (locale) => queryMetadata(httpClient, locale),
    (locale) => queryDataVersion(httpClient, locale),
    (locale) => queryCards(httpClient, locale),
    {
      refresh: false,
    },
  );
  await store.initSession(httpClient);

  const tabSyncListener = (evt: TabSyncEvent) => {
    useStore.setState(evt.state);
  };

  tabSync.addListener(tabSyncListener);

  window.addEventListener("beforeunload", () => {
    tabSync.removeListener(tabSyncListener);
  });
}
