// app/classroom/[sessionId]/page.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import api from "@/lib/api";

export default function ClassroomPage({ params }) {
  const { sessionId } = params;

  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ok" | "error" | "not-found"
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!sessionId) return;
      try {
        setStatus("loading");
        setError("");

        const { data } = await api.get(`/sessions/${sessionId}`);
        if (cancelled) return;

        if (!data || !data.session) {
          setStatus("not-found");
          return;
        }

        setSession(data.session);
        setStatus("ok");
      } catch (err) {
        if (cancelled) return;

        // 404 from backend → treat as not found
        if (err?.response?.status === 404) {
          setStatus("not-found");
        } else {
          console.error("Failed to load classroom session", err);
          setError(
            err?.response?.data?.error ||
              "Failed to load this classroom session."
          );
          setStatus("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // ─────────────────────────────────────
  // STATES
  // ─────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="classroom-page classroom-page--state">
        <div className="container-narrow">
          <h1>Opening classroom…</h1>
          <p>We’re loading the session for this room.</p>
        </div>
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="classroom-page classroom-page--state">
        <div className="container-narrow">
          <h1>Session not found</h1>
          <p>Unable to load this classroom.</p>
          <Link href="/dashboard" className="btn btn--primary">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="classroom-page classroom-page--state">
        <div className="container-narrow">
          <h1>Something went wrong</h1>
          <p>{error}</p>
          <Link href="/dashboard" className="btn btn--ghost">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // At this point we have a valid session
  const title = session?.title || `Classroom #${sessionId}`;

  return (
    <div className="classroom-page">
      <div className="classroom-page__inner container-narrow">
        <header className="classroom-page__header">
          <div>
            <h1 className="classroom-page__title">{title}</h1>
            <p className="classroom-page__subtitle">
              This is your private room for this session. Both teacher and
              learner join the same video room (session #{sessionId}).
            </p>
          </div>
          <div className="classroom-page__header-actions">
            <Link href="/dashboard" className="btn btn--ghost">
              Back to dashboard
            </Link>
            <Link
              href={`/dashboard/sessions/${sessionId}`}
              className="btn btn--ghost"
            >
              View session details
            </Link>
          </div>
        </header>

        <div className="classroom-page__layout">
          <section className="classroom-page__video">
            <PrepVideoCall roomId={sessionId} />
          </section>
        </div>
      </div>
    </div>
  );
}
