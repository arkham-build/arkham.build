const DEFAULT_THEME = "dark";

function init() {
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
  const theme = getColorThemePreference();

  if (theme === "system") {
    document.documentElement.dataset.theme = prefersDarkMode ? "dark" : "light";
  } else {
    document.documentElement.dataset.theme = theme;
  }

  // see: https://vite.dev/guide/build.html#load-error-handling
  window.addEventListener("vite:preloadError", () => {
    retryFailedDynamicImport();
  });
}

function getColorThemePreference() {
  const pref = localStorage.getItem("color-scheme-preference");
  if (pref && ["dark", "light", "system"].includes(pref)) return pref;
  return DEFAULT_THEME;
}

function retryFailedDynamicImport() {
  if (!window.location.hash.includes("retry_failed_dynamic_import")) {
    window.location.hash = "retry_failed_dynamic_import";
    window.location.reload();
  }
}

init();
