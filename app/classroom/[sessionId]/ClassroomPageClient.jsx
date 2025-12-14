// app/classroom/[sessionId]/ClassroomPageClient.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import ClassroomShell from "./ClassroomShell";

export default function ClassroomPageClient({ sessionId, tracks }) {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";

  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ok" | "error"
  const [error, setError] = useState("");

  // Add class to body when classroom is active (to hide site header/footer)
  useEffect(() => {
    if (status === "ok" && session && typeof document !== "undefined") {
      document.body.classList.add("classroom-active");
      document.documentElement.classList.add("classroom-active");
    }

    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("classroom-active");
        document.documentElement.classList.remove("classroom-active");
      }
    };
  }, [status, session]);

  // Load session details from API
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function load() {
      try {
        setStatus("loading");
        setError("");

        const { data } = await api.get(`/sessions/${sessionId}`);
        if (cancelled) return;

        const loadedSession = data?.session || null;
        setSession(loadedSession);

        if (loadedSession) {
          setStatus("ok");
        } else {
          setStatus("error");
          setError(`Session #${sessionId} not found.`);
        }
      } catch (err) {
        console.error("Failed to load session for classroom", err);
        if (cancelled) return;

        setError(
          err?.response?.data?.error || "Failed to load session for classroom"
        );
        setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // LOADING - full screen loading
  if (status === "loading") {
    return (
      <div className="cr-loading-screen">
        <div className="cr-loading-screen__content">
          <div className="cr-loading-screen__spinner" />
          <h1 className="cr-loading-screen__title">Loading classroom…</h1>
          <p className="cr-loading-screen__text">
            Preparing session #{sessionId}
          </p>
        </div>
      </div>
    );
  }

  // ERROR / NOT FOUND - full screen error
  if (status === "error" || !session) {
    return (
      <div className="cr-error-screen">
        <div className="cr-error-screen__content">
          <span className="cr-error-screen__icon">⚠️</span>
          <h1 className="cr-error-screen__title">Session not found</h1>
          <p className="cr-error-screen__text">
            {error || `Unable to load classroom session #${sessionId}.`}
          </p>
          <Link href={`${prefix}/dashboard`} className="cr-error-screen__btn">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ClassroomShell
      session={session}
      sessionId={String(sessionId)}
      tracks={tracks}
      locale={locale}
      prefix={prefix}
    />
  );
}
