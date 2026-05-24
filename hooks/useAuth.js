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
  checking: false,
  hasSessionCookie: false,
  setUser: () => {},
  refresh: async () => {},
  logout: async () => {},
});

const AUTH_REFRESH_TIMEOUT_MS = 45000;

export function AuthProvider({
  children,
  initialUser = null,
  hasSessionCookie = false,
}) {
  const [user, setUser] = useState(initialUser);
  const [checking, setChecking] = useState(
    Boolean(hasSessionCookie && !initialUser)
  );
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
      const { data } = await api.get("/auth/me", {
        timeout: AUTH_REFRESH_TIMEOUT_MS,
      });

      // When impersonating, backend returns { user: impersonatedUser, admin: realAdmin }
      // Preserve the admin info for permission checks
      if (data?.admin && data?.user?._impersonating) {
        safeSet(() => setUser({ ...data.user, _adminRole: data.admin.role }));
      } else {
        safeSet(() => setUser(data?.user ?? null));
      }
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
      await api.post("/auth/logout");
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
    // Public pages without a session cookie should not block on /auth/me.
    if (initialUser || !hasSessionCookie) {
      setChecking(false);
      return;
    }

    refresh();
  }, [initialUser, hasSessionCookie, refresh]);

  return (
    <Ctx.Provider
      value={{ user, checking, hasSessionCookie, setUser, refresh, logout }}
    >
      {children}
    </Ctx.Provider>
  );
}

export default function useAuth() {
  return useContext(Ctx);
}
