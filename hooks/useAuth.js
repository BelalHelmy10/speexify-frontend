// src/hooks/useAuth.js
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import api from "@/lib/api";

const Ctx = createContext({
  user: null,
  checking: true,
  setUser: () => {},
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children, initialUser = null }) {
  const [user, setUser] = useState(initialUser);
  const [checking, setChecking] = useState(!initialUser);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSet = (setter) => {
    if (mountedRef.current) setter();
  };

  // Always use the rewrite (/api/...) through our axios instance.
  const refresh = useCallback(async () => {
    safeSet(() => setChecking(true));
    try {
      const { data } = await api.get("/auth/me"); // ← rewrite (same-origin + cookies)
      safeSet(() => setUser(data?.user ?? null));
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
          "[useAuth.refresh] failed:",
          e?.response?.data || e?.message || e
        );
      }
      safeSet(() => setUser(null));
    } finally {
      safeSet(() => setChecking(false));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout"); // ← rewrite (clears speexify.sid)
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
          "[useAuth.logout] failed:",
          e?.response?.data || e?.message || e
        );
      }
    } finally {
      safeSet(() => setUser(null));
    }
  }, []);

  useEffect(() => {
    // If server passed an initial user we trust it; otherwise, fetch it.
    if (!initialUser) refresh();
  }, [initialUser, refresh]);

  return (
    <Ctx.Provider value={{ user, checking, setUser, refresh, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export default function useAuth() {
  return useContext(Ctx);
}
