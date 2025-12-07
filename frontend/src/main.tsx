import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/noto-sans/standard.css";
import "@fontsource-variable/noto-sans/standard-italic.css";
import "@fontsource-variable/noto-serif/standard.css";
import "@fontsource-variable/noto-serif/standard-italic.css";
import "./styles/icons-encounters.css";
import "./styles/icons-icon.css";
import "./styles/main.css";

import "@/utils/i18n";

import i18n from "@/utils/i18n";
import App from "./app";
import { useStore } from "./store";
import { tabSync } from "./store/persist";
import type { TabSyncEvent } from "./store/persist/tab-sync";
import {
  queryCards,
  queryDataVersion,
  queryMetadata,
} from "./store/services/queries";
import { retryFailedDynamicImport } from "./utils/retry-failed-dynamic-import";
import { applyStoredColorTheme } from "./utils/use-color-theme";

// see: https://vite.dev/guide/build.html#load-error-handling
window.addEventListener("vite:preloadError", () => {
  retryFailedDynamicImport();
});

const rootNode = document.getElementById("root");

if (!rootNode) {
  throw new Error("fatal: did not find root node in DOM.");
}

ReactDOM.createRoot(rootNode).render(
  <React.StrictMode>
    <App />
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
  applyStoredColorTheme();

  await useStore
    .getState()
    .init(queryMetadata, queryDataVersion, queryCards, { refresh: false });

  const tabSyncListener = (evt: TabSyncEvent) => {
    useStore.setState(evt.state);
  };

  tabSync.addListener(tabSyncListener);

  window.addEventListener("beforeunload", () => {
    tabSync.removeListener(tabSyncListener);
  });
}
