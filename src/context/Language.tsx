// The active UI language. i18next's own detector picks an initial guess (saved browser choice,
// else navigator language, else English — see src/i18n.ts) before anyone is signed in; once
// `ActingUser` resolves a user with a saved `locale`, that account preference wins and overrides
// the guess. Manually switching (via LanguageSwitcher) also persists to the account when signed in.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api } from "../api/client";
import type { Locale } from "../api/types";
import i18n from "../i18n";
import { useActingUser } from "./ActingUser";

const RTL_LANGUAGES: Locale[] = ["ar"];

interface LanguageContextValue {
  language: Locale;
  setLanguage: (lang: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
});

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useActingUser();
  const [language, setLanguageState] = useState<Locale>((i18n.language as Locale) || "en");

  // Keep <html lang/dir> and local state in sync with i18next's active language, however it
  // changed (detector, account sync below, or a manual switch).
  useEffect(() => {
    const apply = (lng: string) => {
      const lang = (lng.split("-")[0] as Locale) || "en";
      setLanguageState(lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";
    };
    apply(i18n.language);
    i18n.on("languageChanged", apply);
    return () => {
      i18n.off("languageChanged", apply);
    };
  }, []);

  // The account's saved language wins once known — overrides whatever the browser/localStorage
  // guessed before login.
  useEffect(() => {
    if (user?.locale && user.locale !== i18n.language) {
      void i18n.changeLanguage(user.locale);
    }
  }, [user?.locale]);

  const setLanguage = useCallback(
    (lang: Locale) => {
      void i18n.changeLanguage(lang);
      if (user) {
        void api.patch("/users/me", { locale: lang }).catch(() => {});
      }
    },
    [user],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>
  );
}
