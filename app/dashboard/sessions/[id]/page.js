// app/dashboard/sessions/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import "@/styles/session-detail.scss";

export default function SessionDetailPage({ params }) {
  const router = useRouter();
  const { id } = useParams();

  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ok" | "error"
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function load() {
      try {
        setStatus("loading");
        const { data } = await api.get(`/sessions/${id}`);
        if (cancelled) return;

        setSession(data?.session || null);
        setStatus("ok");
      } catch (err) {
        console.error("Failed to load session", err);
        if (cancelled) return;
        setError(
          err?.response?.data?.error || "Failed to load session details"
        );
        setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleBack = () => {
    router.back();
  };

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: "short",
    });
  };

  // ─────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="page-session-detail">
        <div className="page-session-detail__inner container-narrow">
          <button
            onClick={handleBack}
            className="btn btn--ghost page-session-detail__back"
          >
            ← Back
          </button>

          <div className="session-detail-card session-detail-card--state">
            <header className="session-detail-header">
              <div>
                <h1 className="session-detail-title">Loading session…</h1>
                <p className="session-detail-subtitle">
                  We’re fetching the latest details for this session.
                </p>
              </div>
              <span className="session-detail-status session-detail-status--loading">
                Loading
              </span>
            </header>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────
  // ERROR / NOT FOUND STATE
  // ─────────────────────────────────────
  if (status === "error" || !session) {
    return (
      <div className="page-session-detail">
        <div className="page-session-detail__inner container-narrow">
          <button
            onClick={handleBack}
            className="btn btn--ghost page-session-detail__back"
          >
            ← Back
          </button>

          <div className="session-detail-card session-detail-card--state">
            <header className="session-detail-header">
              <div>
                <h1 className="session-detail-title">Session not available</h1>
                <p className="session-detail-subtitle">
                  We couldn’t load this session right now.
                </p>
              </div>
              <span className="session-detail-status session-detail-status--error">
                Error
              </span>
            </header>

            <p className="session-detail-error">
              {error || "Could not load session."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────
  // NORMAL STATE
  // ─────────────────────────────────────
  const {
    title,
    startAt,
    endAt,
    meetingUrl,
    notes,
    user,
    teacher,
    status: s,
    teacherFeedback,
  } = session;

  return (
    <div className="page-session-detail">
      <div className="page-session-detail__inner container-narrow">
        <button
          onClick={handleBack}
          className="btn btn--ghost page-session-detail__back"
        >
          ← Back
        </button>

        <div className="session-detail-card">
          <header className="session-detail-header">
            <div>
              <h1 className="session-detail-title">
                {title || "Session details"}
              </h1>
              <p className="session-detail-subtitle">
                Overview of this lesson, participants, and feedback.
              </p>
            </div>

            {s && (
              <span
                className={`session-detail-status session-detail-status--${s}`}
              >
                {s}
              </span>
            )}
          </header>

          <div className="session-detail-grid">
            <section className="session-detail-section">
              <h3 className="session-detail-section__title">Time</h3>
              <p className="session-detail-section__body">
                <strong>Start:</strong> {formatDateTime(startAt)}
                <br />
                <strong>End:</strong> {formatDateTime(endAt)}
              </p>
            </section>

            <section className="session-detail-section">
              <h3 className="session-detail-section__title">Teacher</h3>
              {teacher ? (
                <p className="session-detail-section__body">
                  {teacher.name || teacher.email}
                  <br />
                  <span className="session-detail-muted">{teacher.email}</span>
                </p>
              ) : (
                <p className="session-detail-section__body">Not assigned.</p>
              )}
            </section>

            <section className="session-detail-section">
              <h3 className="session-detail-section__title">Learner</h3>
              {user ? (
                <p className="session-detail-section__body">
                  {user.name || user.email}
                  <br />
                  <span className="session-detail-muted">{user.email}</span>
                </p>
              ) : (
                <p className="session-detail-section__body">Not found.</p>
              )}
            </section>
          </div>

          {/* UPDATED JOIN SECTION */}
          <section className="session-detail-section session-detail-section--wide">
            <div className="session-detail-section__header">
              <h3 className="session-detail-section__title">Join link</h3>
            </div>

            <div className="session-detail-join-actions">
              {/* Classroom is always available for this session */}
              <Link
                href={`/classroom/${session.id}`}
                className="btn btn--primary session-detail-join-btn"
              >
                Open Speexify classroom
              </Link>

              {meetingUrl && (
                <a
                  href={meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--ghost session-detail-join-btn"
                >
                  External meeting link
                </a>
              )}

              {!meetingUrl && (
                <p className="session-detail-section__body">
                  No external meeting link set; use the Speexify classroom
                  above.
                </p>
              )}
            </div>
          </section>

          <section className="session-detail-section session-detail-section--wide">
            <div className="session-detail-section__header">
              <h3 className="session-detail-section__title">
                Notes / Homework
              </h3>
            </div>
            <p className="session-detail-section__body">
              {notes && notes.trim()
                ? notes
                : "No notes or homework have been added for this session yet."}
            </p>
          </section>

          {teacherFeedback && (
            <section className="session-detail-section session-detail-section--wide">
              <div className="session-detail-section__header">
                <h3 className="session-detail-section__title">
                  Teacher feedback
                </h3>
                <p className="session-detail-section__hint">
                  Reflections from your teacher to help guide your next steps.
                </p>
              </div>

              <div className="session-detail-feedback-grid">
                <div className="session-detail-feedback">
                  <h4 className="session-detail-feedback__title">
                    Message to the learner
                  </h4>
                  <p className="session-detail-feedback__body">
                    {teacherFeedback.messageToLearner?.trim()
                      ? teacherFeedback.messageToLearner
                      : "No message provided."}
                  </p>
                </div>

                <div className="session-detail-feedback">
                  <h4 className="session-detail-feedback__title">
                    Comments on the session
                  </h4>
                  <p className="session-detail-feedback__body">
                    {teacherFeedback.commentsOnSession?.trim()
                      ? teacherFeedback.commentsOnSession
                      : "No comments provided."}
                  </p>
                </div>

                <div className="session-detail-feedback">
                  <h4 className="session-detail-feedback__title">
                    Future steps
                  </h4>
                  <p className="session-detail-feedback__body">
                    {teacherFeedback.futureSteps?.trim()
                      ? teacherFeedback.futureSteps
                      : "No future steps added yet."}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
