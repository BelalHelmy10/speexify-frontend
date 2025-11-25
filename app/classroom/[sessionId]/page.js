// app/classroom/[sessionId]/page.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import PrepVideoCall from "../../resources/prep/PrepVideoCall";

// ⬅️ we’ll later import PrepShell + a classroom picker here

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
        {/* LEFT: live video room */}
        <aside className="prep-info-card classroom-video-pane">
          <div className="prep-info-card__header">
            <h1 className="prep-info-card__title">
              {session.title || "Classroom"}
            </h1>
            <p className="prep-info-card__description">
              This is your private room for this session. Both teacher and
              learner join the same video room (session #{sessionId}).
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

        {/* RIGHT: prep / materials pane */}
        <section className="prep-viewer classroom-prep-pane">
          {/* 
            ⬇️ PLACEHOLDER

            This is exactly where we’ll embed:
            - Teacher: small dropdown picker (track → book → level → unit → resource)
            - Teacher + learner: <PrepShell resource={...} viewer={...} sessionId={sessionId} collaborative />
          */}

          <div className="prep-viewer__placeholder">
            <h2>Lesson materials</h2>
            <p>
              This right-hand side will become the shared prep room: PDFs,
              slides, and annotations synced between teacher and learner.
            </p>
            <p>
              The video room is already live on the left. Next step is wiring
              the classroom to your Resources data and PrepShell.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
