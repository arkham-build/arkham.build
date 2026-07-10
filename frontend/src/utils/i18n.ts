import i18n, { type LanguageDetectorModule } from "i18next";

import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";

const localStorageDectector: LanguageDetectorModule = {
  type: "languageDetector",
  detect() {
    if (typeof window === "undefined") return "en";
    const lang = localStorage.getItem("i18nextLng");
    return lang || "en";
  },
  cacheUserLanguage(lng: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("i18nextLng", lng);
  },
};

const importBackend = resourcesToBackend(
  async (lng: string, namespace: string) => {
    const bundle = await import(`@/locales/${lng}.json`);
    return bundle.default[namespace];
  },
);

void i18n
  .use(localStorageDectector)
  .use(importBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    // Load the exact selected locale (e.g. `zh-cn`), not just the base language.
    // `languageOnly` would collapse `zh-cn` -> `zh`, making the simplified locale unreachable.
    load: "currentOnly",
    // Keep region subtags lower-cased so they match the lower-cased locale filenames
    // (i18next would otherwise format `zh-cn` -> `zh-CN`, which 404s on case-sensitive hosts).
    lowerCaseLng: true,
    partialBundledLanguages: true,
    showSupportNotice: false,
    resources: {
      en,
    },
    interpolation: {
      escapeValue: false,
    },
  })
  .catch(console.error);

i18n.on("languageChanged", (lng) => {
  if (document) document.documentElement.lang = lng;
});

export function changeLanguage(lng: string) {
  if (i18n.language === lng) return;
  return i18n.changeLanguage(lng);
}

export default i18n;
