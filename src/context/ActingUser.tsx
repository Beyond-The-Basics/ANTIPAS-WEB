import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import {
  api,
  clearCredentials,
  getActingUserId,
  getToken,
  setActingUserId,
  setToken,
} from "../api/client";
import type { AuthTokens, User } from "../api/types";

/**
 * Who the requests are coming from.
 *
 * Normally that is the signed-in user, resolved from a stored JWT via `/auth/me`. In dev it can
 * also be someone you're impersonating through the header's "act as" switcher, which uses the
 * backend's non-production `X-User-Id` fallback. Both land in `user`, so screens never care which.
 */
interface ActingUserContextValue {
  user: User | null;
  loading: boolean;
  /** True when authenticated by a real token rather than the dev switcher. */
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: SignupInput) => Promise<User>;
  logout: () => void;
  /** Dev-only impersonation. Drops any real session first — the two must never overlap. */
  actAs: (user: User | null) => void;
  refresh: () => Promise<void>;
}

export interface SignupInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

const ActingUserContext = createContext<ActingUserContextValue>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {
    throw new Error("ActingUserProvider missing");
  },
  signup: async () => {
    throw new Error("ActingUserProvider missing");
  },
  logout: () => {},
  actAs: () => {},
  refresh: async () => {},
});

export function useActingUser(): ActingUserContextValue {
  return useContext(ActingUserContext);
}

export function ActingUserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setAuthenticated] = useState(false);

  const refresh = useCallback(async () => {
    const authed = Boolean(getToken());
    if (!authed && !getActingUserId()) {
      setUserState(null);
      setAuthenticated(false);
      setLoading(false);
      return;
    }
    try {
      // Resolves through whichever credential `client.ts` attached, so it validates a stored
      // token and a dev impersonation by the same path.
      setUserState(await api.get<User>("/auth/me"));
      setAuthenticated(authed);
    } catch {
      // Expired or rejected credential — drop it rather than let every screen retry it.
      clearCredentials();
      setUserState(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const adopt = (tokens: AuthTokens): User => {
    setActingUserId(null); // a real session supersedes any dev impersonation
    setToken(tokens.access_token);
    setUserState(tokens.user);
    setAuthenticated(true);
    setLoading(false);
    return tokens.user;
  };

  const login = async (email: string, password: string) =>
    adopt(await api.post<AuthTokens>("/auth/login", { email, password }));

  const signup = async (data: SignupInput) => adopt(await api.post<AuthTokens>("/auth/signup", data));

  const logout = () => {
    // No server-side revocation — a token stays valid until it expires (see the backend's
    // app/core/security.py). Signing out is purely discarding the client's copy.
    clearCredentials();
    setUserState(null);
    setAuthenticated(false);
  };

  const actAs = (next: User | null) => {
    setToken(null);
    setActingUserId(next ? next.id : null);
    setUserState(next);
    setAuthenticated(false);
  };

  return (
    <ActingUserContext.Provider
      value={{ user, loading, isAuthenticated, login, signup, logout, actAs, refresh }}
    >
      {children}
    </ActingUserContext.Provider>
  );
}
