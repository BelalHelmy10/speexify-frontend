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
      <div className="spx-resources-page">
        <div className="spx-resources-page__inner spx-prep-page">
          <div className="spx-prep-empty-card">
            <h1 className="spx-prep-empty-card__title">Loading classroom…</h1>
            <p className="spx-prep-empty-card__text">
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
      <div className="spx-resources-page">
        <div className="spx-resources-page__inner spx-prep-page">
          <div className="spx-prep-empty-card">
            <h1 className="spx-prep-empty-card__title">Session not found</h1>
            <p className="spx-prep-empty-card__text">
              {error ||
                `Unable to load this classroom (session #${sessionId}).`}
            </p>
            <Link href="/dashboard" className="spx-button spx-button--primary">
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // NORMAL STATE → now show ClassroomShell
  return (
    <div className="spx-resources-page">
      <div className="spx-resources-page__inner spx-prep-page">
        <ClassroomShell
          session={session}
          sessionId={String(sessionId)}
          tracks={tracks}
        />
      </div>
    </div>
  );
}
