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
  // "checking" | "authenticated" | "unauthenticated" | "error"
  status: "unauthenticated",
  checking: false,
  hasSessionCookie: false,
  setUser: () => {},
  refresh: async () => {},
  logout: async () => {},
});

// Timeout for a single /auth/me attempt.
const AUTH_REFRESH_TIMEOUT_MS = 20000;
// On a transient failure (timeout / network / 5xx) we keep retrying with
// backoff until this budget runs out. The backend can cold-start (Render free
// tier sleeps after inactivity and takes ~30-50s to wake), so we give it room
// to come up instead of giving up — and we NEVER log the user out for it.
const AUTH_WAKE_BUDGET_MS = 60000;

// A 401/403 is a definitive "this session is not valid" answer.
// Anything else (timeout, network error, 5xx, cold start) just means we
// couldn't verify right now — it is NOT proof the user is logged out.
function isDefinitiveAuthFailure(err) {
  const s = err?.response?.status;
  return s === 401 || s === 403;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({
  children,
  initialUser = null,
  hasSessionCookie = false,
}) {
  const [user, setUser] = useState(initialUser);
  const [status, setStatus] = useState(() => {
    if (initialUser) return "authenticated";
    if (hasSessionCookie) return "checking";
    return "unauthenticated";
  });

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSet = (setter) => {
    if (mountedRef.current) setter();
  };

  const applyUser = useCallback((data) => {
    // When impersonating, backend returns { user: impersonatedUser, admin: realAdmin }.
    // Preserve the admin info for permission checks.
    const nextUser =
      data?.admin && data?.user?._impersonating
        ? { ...data.user, _adminRole: data.admin.role }
        : (data?.user ?? null);

    safeSet(() => {
      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "unauthenticated");
    });
  }, []);

  // Verify the session against the backend.
  //
  // CRITICAL: a failed *check* is not the same as being logged out.
  // - 401 / 403            -> the session is genuinely invalid -> clear user.
  // - timeout / network / 5xx -> we couldn't verify right now (e.g. the backend
  //   is cold-starting). Keep the existing user, retry within a time budget,
  //   and if we still can't reach it, surface status "error" WITHOUT destroying
  //   the session. A brief server hiccup must never log a valid user out.
  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    safeSet(() => setStatus("checking"));

    const deadline = Date.now() + AUTH_WAKE_BUDGET_MS;

    try {
      for (let attempt = 0; ; attempt += 1) {
        try {
          const { data } = await api.get("/auth/me", {
            timeout: AUTH_REFRESH_TIMEOUT_MS,
          });
          applyUser(data);
          return;
        } catch (e) {
          if (isDefinitiveAuthFailure(e)) {
            safeSet(() => {
              setUser(null);
              setStatus("unauthenticated");
            });
            return;
          }

          const timeLeft = deadline - Date.now();
          if (timeLeft <= 0 || !mountedRef.current) {
            if (process.env.NODE_ENV !== "production") {
              // eslint-disable-next-line no-console
              console.warn(
                "[useAuth.refresh] could not verify session (keeping current state):",
                e?.message || e
              );
            }
            // Do NOT clear the user here — we just couldn't reach the server.
            safeSet(() => setStatus("error"));
            return;
          }

          const backoff = Math.min(1500 * 2 ** attempt, 8000); // 1.5s,3s,6s,8s…
          await sleep(Math.min(backoff, timeLeft));
          // stay in "checking" and try again
        }
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [applyUser]);

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
      safeSet(() => {
        setUser(null);
        setStatus("unauthenticated");
      });
    }
  }, []);

  useEffect(() => {
    // Server already resolved the user, or there's no session to verify.
    if (initialUser || !hasSessionCookie) {
      return;
    }
    refresh();
  }, [initialUser, hasSessionCookie, refresh]);

  return (
    <Ctx.Provider
      value={{
        user,
        status,
        checking: status === "checking",
        hasSessionCookie,
        setUser,
        refresh,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export default function useAuth() {
  return useContext(Ctx);
}
