// The active UI appearance. A visitor's choice (or the OS default, via "system") is applied
// immediately and kept in localStorage before anyone is signed in — see the inline script in
// index.html that reads the same key to avoid a light-mode flash on load. Once `ActingUser`
// resolves a user with a saved `theme`, that account preference wins and overrides local state,
// same override-on-login pattern as `Language.tsx`'s locale sync.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api } from "../api/client";
import type { Theme } from "../api/types";
import { useActingUser } from "./ActingUser";

const STORAGE_KEY = "kickoff:theme";

interface ThemeContextValue {
  /** The user's stated preference — may be "system". */
  theme: Theme;
  /** What's actually applied right now — always "light" or "dark". */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

function readStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(theme: Theme): "light" | "dark" {
  return theme === "system" ? (prefersDark() ? "dark" : "light") : theme;
}

function apply(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useActingUser();
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => resolve(theme));

  useEffect(() => {
    setResolvedTheme(resolve(theme));
    apply(resolve(theme));
  }, [theme]);

  // Track the OS setting live while following "system", so flipping the device theme updates the
  // app without a reload.
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setResolvedTheme(resolve("system"));
      apply(resolve("system"));
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  // The account's saved preference wins once known — overrides whatever localStorage/OS guessed
  // before login.
  useEffect(() => {
    if (user?.theme && user.theme !== theme) {
      setThemeState(user.theme);
      localStorage.setItem(STORAGE_KEY, user.theme);
    }
  }, [user?.theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      localStorage.setItem(STORAGE_KEY, next);
      if (user) {
        void api.patch("/users/me", { theme: next }).catch(() => {});
      }
    },
    [user],
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
