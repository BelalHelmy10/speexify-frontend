// src/hooks/useAuth.js
"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { me as apiMe, logout as apiLogout } from "@/lib/auth";

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

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const data = await apiMe();
      setUser(data?.user ?? null);
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
