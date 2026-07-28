// i18next setup. Detection order: a signed-in user's saved `locale` wins once resolved (see
// context/Language.tsx, which calls `changeLanguage` after `ActingUser` loads); until then this
// falls back to whatever was last picked in this browser (localStorage), then the browser's own
// language, then English.

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import ar from "./locales/ar.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "fr", "ar"],
    load: "languageOnly",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
