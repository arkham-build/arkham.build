import i18n from "@/utils/i18n";
import { useCallback, useState } from "react";
import { useMedia } from "./use-media";

export function getAvailableThemes(): Record<string, string> {
  return {
    dark: i18n.t("settings.display.theme_dark"),
    light: i18n.t("settings.display.theme_light"),
    system: i18n.t("settings.display.theme_system"),
  };
}

const DEFAULT_THEME = "dark";

export function getColorThemePreference() {
  const pref = localStorage.getItem("color-scheme-preference");
  if (pref && getAvailableThemes()[pref]) return pref;
  return DEFAULT_THEME;
}

function persistColorTheme(theme: string | null | undefined) {
  localStorage.setItem("color-scheme-preference", theme ?? DEFAULT_THEME);
}

function applyColorTheme(theme: string, prefersDarkMode: boolean) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.remove("theme-light", "theme-system");
    root.classList.add("theme-dark");
  } else if (theme === "light") {
    root.classList.remove("theme-dark", "theme-system");
    root.classList.add("theme-light");
  } else {
    root.classList.remove("theme-dark", "theme-light");
    root.classList.add("theme-system");
  }
  if (theme === "system") {
    document.documentElement.dataset.theme = prefersDarkMode ? "dark" : "light";
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

export function applyStoredColorTheme() {
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
  const theme = getColorThemePreference();
  applyColorTheme(theme, prefersDarkMode.matches);
}

export function useColorThemeManager() {
  const [currentTheme, setCurrentTheme] = useState(getColorThemePreference());

  const prefersDarkMode = useMedia("(prefers-color-scheme: dark)");

  const updateColorScheme = useCallback(
    (value: string) => {
      const nextTheme = value || DEFAULT_THEME;
      setCurrentTheme(nextTheme);
      persistColorTheme(nextTheme);
      applyColorTheme(nextTheme, prefersDarkMode);
    },
    [prefersDarkMode],
  );

  return [currentTheme, updateColorScheme] as const;
}

export function useResolvedColorTheme() {
  const [currentTheme] = useColorThemeManager();

  const isDarkMode = useMedia("(prefers-color-scheme: dark)");

  if (currentTheme === "system") {
    return isDarkMode ? "dark" : "light";
  }

  return currentTheme;
}
