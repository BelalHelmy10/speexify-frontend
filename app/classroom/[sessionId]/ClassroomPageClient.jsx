// app/classroom/[sessionId]/ClassroomPageClient.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import ClassroomShell from "./ClassroomShell";

export default function ClassroomPageClient({ sessionId, tracks }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ok" | "error"
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function load() {
      try {
        setStatus("loading");
        setError("");
        const { data } = await api.get(`/sessions/${sessionId}`);
        if (cancelled) return;
        setSession(data?.session || null);
        setStatus("ok");
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

  // LOADING
  if (status === "loading") {
    return (
      <div className="resources-page">
        <div className="resources-page__inner prep-page">
          <div className="prep-empty-card">
            <h1 className="prep-empty-card__title">Loading classroom…</h1>
            <p className="prep-empty-card__text">
              We’re fetching the latest details for this session.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ERROR / NOT FOUND
  if (status === "error" || !session) {
    return (
      <div className="resources-page">
        <div className="resources-page__inner prep-page">
          <div className="prep-empty-card">
            <h1 className="prep-empty-card__title">Session not found</h1>
            <p className="prep-empty-card__text">
              {error ||
                `Unable to load this classroom (session #${sessionId}).`}
            </p>
            <Link
              href="/dashboard"
              className="resources-button resources-button--primary"
            >
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // NORMAL STATE → now show ClassroomShell
  return (
    <div className="resources-page">
      <div className="resources-page__inner prep-page">
        <ClassroomShell
          session={session}
          sessionId={String(sessionId)}
          tracks={tracks}
        />
      </div>
    </div>
  );
}
