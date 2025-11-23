// app/classroom/[sessionId]/page.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import PrepVideoCall from "../../resources/prep/PrepVideoCall";

export default function ClassroomPage({ params }) {
  const sessionId = params.sessionId;

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

  // ─────────────────────────
  // LOADING STATE
  // ─────────────────────────
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

  // ─────────────────────────
  // ERROR / NOT FOUND STATE
  // ─────────────────────────
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

  // ─────────────────────────
  // NORMAL STATE
  // ─────────────────────────
  return (
    <div className="resources-page">
      <div className="resources-page__inner prep-page">
        {/* LEFT: info + call */}
        <aside className="prep-info-card">
          <div className="prep-info-card__header">
            <h1 className="prep-info-card__title">
              {session.title || "Classroom"}
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
              ← Back to dashboard
            </Link>
            <Link
              href={`/dashboard/sessions/${session.id}`}
              className="resources-button resources-button--ghost"
            >
              View session details
            </Link>
          </div>

          {/* WebRTC call – uses sessionId as room id */}
          <PrepVideoCall roomId={String(sessionId)} />
        </aside>

        {/* RIGHT: for now just a placeholder area */}
        <section className="prep-viewer">
          <div className="prep-viewer__placeholder">
            <h2>Classroom ready</h2>
            <p>
              The video room is active on the left. We can wire in shared
              resources here later if you want the full prep UI inside the
              classroom.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
