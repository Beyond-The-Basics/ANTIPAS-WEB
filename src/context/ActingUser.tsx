import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { api, getActingUserId, setActingUserId } from "../api/client";
import type { User } from "../api/types";

interface ActingUserContextValue {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  refresh: () => Promise<void>;
}

const ActingUserContext = createContext<ActingUserContextValue>({
  user: null,
  loading: true,
  setUser: () => {},
  refresh: async () => {},
});

export function useActingUser(): ActingUserContextValue {
  return useContext(ActingUserContext);
}

export function ActingUserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const id = getActingUserId();
    if (!id) {
      setUserState(null);
      setLoading(false);
      return;
    }
    try {
      // `/users/me` resolves through the auth header the client already sends, so this is the same
      // call the app will make once Firebase replaces the X-User-Id stub.
      setUserState(await api.get<User>(`/users/me`));
    } catch {
      setActingUserId(null);
      setUserState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const setUser = (next: User | null) => {
    setActingUserId(next ? next.id : null);
    setUserState(next);
  };

  return (
    <ActingUserContext.Provider value={{ user, loading, setUser, refresh }}>
      {children}
    </ActingUserContext.Provider>
  );
}
