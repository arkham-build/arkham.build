const DEFAULT_THEME = "dark";
const THEME_COLORS = {
  dark: "#2e3440",
  light: "#fafafa",
};

function init() {
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
  const theme = getColorThemePreference();
  const resolvedTheme =
    theme === "system" ? (prefersDarkMode.matches ? "dark" : "light") : theme;

  applyColorTheme(resolvedTheme);

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

function applyColorTheme(theme) {
  document.documentElement.dataset.theme = theme;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = THEME_COLORS[theme];
}

function retryFailedDynamicImport() {
  if (!window.location.hash.includes("retry_failed_dynamic_import")) {
    window.location.hash = "retry_failed_dynamic_import";
    window.location.reload();
  }
}

init();
