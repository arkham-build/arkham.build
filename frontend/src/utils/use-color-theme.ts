import { useCallback, useEffect, useState } from "react";
import i18n from "@/utils/i18n";
import { useMedia } from "./use-media";

export function getAvailableThemes(): Record<string, string> {
  return {
    dark: i18n.t("settings.display.theme_dark"),
    light: i18n.t("settings.display.theme_light"),
    system: i18n.t("settings.display.theme_system"),
  };
}

const DEFAULT_THEME = "dark";

function getColorThemePreference() {
  const pref = localStorage.getItem("color-scheme-preference");
  if (pref && getAvailableThemes()[pref]) return pref;
  return DEFAULT_THEME;
}

function persistColorTheme(theme: string | null | undefined) {
  localStorage.setItem("color-scheme-preference", theme ?? DEFAULT_THEME);
}

function applyColorTheme(theme: string, prefersDarkMode: boolean) {
  if (theme === "system") {
    document.documentElement.dataset.theme = prefersDarkMode ? "dark" : "light";
  } else {
    document.documentElement.dataset.theme = theme;
  }
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

export function useColorThemeListener() {
  const prefersDarkMode = useMedia("(prefers-color-scheme: dark)");
  useEffect(() => {
    const current = getColorThemePreference();
    applyColorTheme(current, prefersDarkMode);
  }, [prefersDarkMode]);
}
