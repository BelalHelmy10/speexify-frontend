// app/classroom/[sessionId]/page.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";

export default function ClassroomPage({ params }) {
  const { sessionId } = params;

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

        // Same pattern as your dashboard/session-detail page,
        // but hitting the same endpoint:
        const { data } = await api.get(`/sessions/${sessionId}`, {
          params: { t: Date.now() },
        });

        if (cancelled) return;

        const s = data?.session || data || null;
        if (!s) {
          setError("Session not found.");
          setStatus("error");
          return;
        }

        setSession(s);
        setStatus("ok");
      } catch (err) {
        console.error("[classroom] Failed to load session", err);
        if (cancelled) return;

        setError(
          err?.response?.data?.error ||
            "We couldn’t load this classroom. Please try again."
        );
        setStatus("error");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // ─────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────
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

  // ─────────────────────────────────────
  // ERROR / NOT FOUND
  // ─────────────────────────────────────
  if (status === "error" || !session) {
    return (
      <div className="resources-page">
        <div className="resources-page__inner prep-page">
          <div className="prep-empty-card">
            <h1 className="prep-empty-card__title">Session not found</h1>
            <p className="prep-empty-card__text">
              Unable to load this classroom.
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

  // ─────────────────────────────────────
  // NORMAL STATE
  // ─────────────────────────────────────
  const { title } = session;

  return (
    <div className="resources-page">
      <div className="resources-page__inner prep-page">
        {/* Simple header / breadcrumb */}
        <nav className="unit-breadcrumbs prep-breadcrumbs">
          <Link href="/dashboard" className="unit-breadcrumbs__link">
            Dashboard
          </Link>
          <span className="unit-breadcrumbs__separator">/</span>
          <span className="unit-breadcrumbs__crumb prep-breadcrumbs__current">
            {title || "Classroom"}
          </span>
        </nav>

        <div className="prep-layout">
          <aside className="prep-info-card">
            <div className="prep-info-card__header">
              <h1 className="prep-info-card__title">
                {title || "Live classroom"}
              </h1>
              <p className="prep-info-card__description">
                This is your private room for this session. Both teacher and
                learner see the same video room (session #{sessionId}).
              </p>
            </div>

            <div className="prep-info-card__actions">
              <Link
                href="/dashboard"
                className="resources-button resources-button--ghost"
              >
                Back to dashboard
              </Link>
              <Link
                href={`/dashboard/sessions/${sessionId}`}
                className="resources-button resources-button--ghost"
              >
                View session details
              </Link>
            </div>
          </aside>

          <section className="prep-viewer">
            {/* Just the video call for now. 
               WebRTC room id = sessionId, so teacher & learner
               who hit the same /classroom/[id] URL share the call. */}
            <PrepVideoCall roomId={sessionId} />
          </section>
        </div>
      </div>
    </div>
  );
}
