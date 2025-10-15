"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Spinner from "./Spinner";

/** Require the user to be authenticated. */
export function RequireAuth({
  children,
  to = "/login",
  label = "Checking session…",
}) {
  const { user, checking } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!checking && !user) router.replace(to);
  }, [checking, user, router, to]);

  if (checking || !user) return <Spinner label={label} />;
  return children;
}

/** Require the user to be anonymous (e.g. on /login or /register). */
export function RequireAnon({
  children,
  to = "/dashboard",
  label = "Checking session…",
}) {
  const { user, checking } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!checking && user) router.replace(to);
  }, [checking, user, router, to]);

  if (checking) return <Spinner label={label} />;
  if (user) return null; // redirecting
  return children;
}

/** Optional: redirect from Home to dashboard if logged in. */
export function RedirectHomeIfAuthed({ children }) {
  const { user, checking } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!checking && user) router.replace("/dashboard");
  }, [checking, user, router]);

  // While checking, render the normal home so there’s no flash
  return children;
}
