// src/hooks/useAuth.js
"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { me as apiMe, logout as apiLogout } from "../lib/auth";

const Ctx = createContext({
  user: null,
  checking: true,
  setUser: () => {},
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children, initialUser = null }) {
  // Seed with the user from the server (no navbar flicker)
  const [user, setUser] = useState(initialUser);
  const [checking, setChecking] = useState(!initialUser); // if we have a user, we're not checking

  const refresh = useCallback(async () => {
    try {
      const data = await apiMe();
      setUser(data?.user || null);
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // If we didn't get a user from the server, fetch on mount
    if (!initialUser) refresh();
    // If we DID get a user, you can still optionally background-refresh:
    // else refresh();
  }, [initialUser, refresh]);

  return (
    <Ctx.Provider value={{ user, setUser, checking, refresh, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export default function useAuth() {
  return useContext(Ctx);
}
