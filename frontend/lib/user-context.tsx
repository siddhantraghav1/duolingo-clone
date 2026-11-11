"use client";

/**
 * Shares the learner's stats (GET /api/me) with every component.
 * The top bar, right panel and lesson player all read the same data, and any
 * page can call refreshMe() after something changes (e.g. a finished lesson).
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api } from "./api";
import type { Me } from "./types";

type UserContextValue = {
  me: Me | null; // null while loading
  error: string | null; // e.g. backend not running
  refreshMe: () => Promise<void>;
  setMe: (me: Me) => void; // when an API call already returned fresh stats
};

const UserContext = createContext<UserContextValue | null>(null);

const OFFLINE_MESSAGE = "Can't reach the server. Is the backend running on port 8000?";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    try {
      setMe(await api.getMe());
      setError(null);
    } catch {
      setError(OFFLINE_MESSAGE);
    }
  }, []);

  // load once when the app opens
  useEffect(() => {
    let cancelled = false; // ignore the answer if the component is gone
    api
      .getMe()
      .then((data) => !cancelled && setMe(data))
      .catch(() => !cancelled && setError(OFFLINE_MESSAGE));
    return () => {
      cancelled = true;
    };
  }, []);

  // when a heart is about to grow back, fetch again at that moment
  const secondsToHeart = me?.seconds_to_next_heart;
  useEffect(() => {
    if (secondsToHeart == null) return;
    const timer = setTimeout(refreshMe, (secondsToHeart + 1) * 1000);
    return () => clearTimeout(timer);
  }, [secondsToHeart, refreshMe]);

  return (
    <UserContext.Provider value={{ me, error, refreshMe, setMe }}>{children}</UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser() must be used inside <UserProvider>");
  return context;
}
