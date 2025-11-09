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
  // src/hooks/useAuth.js
  // ...
  const refresh = useCallback(async () => {
    safeSet(() => setChecking(true));

    async function tryOnce() {
      // Force no-cache + cache-buster; axios instance already has withCredentials
      const { data } = await api.get("/auth/me", {
        params: { t: Date.now() },
        headers: { "Cache-Control": "no-store" },
      });
      return data?.user ?? null;
    }

    try {
      let u = await tryOnce();
      // Immediately after Google login, the Set-Cookie can land a tick late.
      // Retry quickly with a tiny backoff (total < 500ms).
      for (let i = 0; !u && i < 3; i++) {
        await new Promise((r) => setTimeout(r, 80 * (i + 1))); // 80ms, 160ms, 240ms
        u = await tryOnce();
      }
      safeSet(() => setUser(u));
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
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
  // ...

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
