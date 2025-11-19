"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/components/ToastProvider";
import "@/styles/session-feedback.scss";
import { trackEvent } from "@/lib/analytics";

export default function SessionFeedbackPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const { user, checking } = useAuth();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [messageToLearner, setMessageToLearner] = useState("");
  const [commentsOnSession, setCommentsOnSession] = useState("");
  const [futureSteps, setFutureSteps] = useState("");

  const isTeacher = user?.role === "teacher";
  const toast = useToast();

  const canEdit = useMemo(() => {
    if (!session) return false;
    // could restrict to completed sessions if you want
    return isTeacher;
  }, [session, isTeacher]);

  useEffect(() => {
    if (!id || checking) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get(`/sessions/${id}`);
        if (cancelled) return;

        const s = data?.session || null;
        setSession(s);

        const tf = s?.teacherFeedback || {};
        setMessageToLearner(tf.messageToLearner || "");
        setCommentsOnSession(tf.commentsOnSession || "");
        setFutureSteps(tf.futureSteps || "");
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load session feedback", err);
        setError(
          err?.response?.data?.error || "Failed to load session feedback"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, checking]);

  const handleBack = () => {
    router.push(`/dashboard/sessions/${id}`);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    try {
      setSaving(true);
      setError("");

      await api.post(`/sessions/${id}/feedback/teacher`, {
        messageToLearner,
        commentsOnSession,
        futureSteps,
      });

      // 🔹 Analytics: teacher feedback submitted
      trackEvent("feedback_submitted", {
        role: "teacher",
        sessionId: id,
      });

      // 🔹 Optionally treat this as the moment session is completed
      trackEvent("session_completed", {
        sessionId: id,
        by: "teacher_feedback",
      });

      toast.success("Feedback saved.");
    } catch (err) {
      console.error("Failed to save feedback", err);
      setError(err?.response?.data?.error || "Failed to save feedback");
      toast.error("Failed to save feedback");
    } finally {
      setSaving(false);
    }
  };

  const formatSessionDate = () => {
    const start = session?.startAt;
    if (!start) return "";
    const d = new Date(start);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // ───────────────── LOADING ─────────────────
  if (checking || loading) {
    return (
      <div className="page-session-feedback">
        <div className="page-session-feedback__inner container-narrow">
          <button
            onClick={handleBack}
            className="btn btn--ghost page-session-feedback__back"
          >
            ← Back to session
          </button>

          <div className="session-feedback-card session-feedback-card--state">
            <header className="session-feedback-header">
              <div>
                <h1 className="session-feedback-title">Loading feedback…</h1>
                <p className="session-feedback-subtitle">
                  We’re preparing the feedback editor for this session.
                </p>
              </div>
              <span className="session-feedback-status session-feedback-status--loading">
                Loading
              </span>
            </header>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────── NOT FOUND / ERROR ─────────────────
  if (!session) {
    return (
      <div className="page-session-feedback">
        <div className="page-session-feedback__inner container-narrow">
          <button
            onClick={handleBack}
            className="btn btn--ghost page-session-feedback__back"
          >
            ← Back to session
          </button>

          <div className="session-feedback-card session-feedback-card--state">
            <header className="session-feedback-header">
              <div>
                <h1 className="session-feedback-title">Session not found</h1>
                <p className="session-feedback-subtitle">
                  We couldn’t find this session or load its feedback.
                </p>
              </div>
              <span className="session-feedback-status session-feedback-status--error">
                Error
              </span>
            </header>

            {error && (
              <p className="session-feedback-error">
                {error || "Could not load session."}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ───────────────── NORMAL STATE ─────────────────
  const sessionDateLabel = formatSessionDate();

  return (
    <div className="page-session-feedback">
      <div className="page-session-feedback__inner container-narrow">
        <button
          onClick={handleBack}
          className="btn btn--ghost page-session-feedback__back"
        >
          ← Back to session
        </button>

        <div className="session-feedback-card">
          <header className="session-feedback-header">
            <div>
              <h1 className="session-feedback-title">Session feedback</h1>
              <p className="session-feedback-subtitle">
                Session
                {sessionDateLabel ? ` · ${sessionDateLabel}` : ""}
              </p>
              <p className="session-feedback-context">
                {canEdit
                  ? "You can edit and save feedback for this session. The learner will see it as read-only."
                  : "This feedback is read-only. Only the teacher can edit it."}
              </p>
            </div>
            <span
              className={`session-feedback-status ${
                canEdit
                  ? "session-feedback-status--editable"
                  : "session-feedback-status--readonly"
              }`}
            >
              {canEdit ? "Editable" : "Read-only"}
            </span>
          </header>

          {error && <div className="session-feedback-alert">{error}</div>}

          <div className="session-feedback-form-card">
            <div className="session-feedback-grid">
              <label className="session-feedback-field">
                <span className="session-feedback-label">
                  Message to the learner
                </span>
                <textarea
                  rows={4}
                  value={messageToLearner}
                  onChange={(e) => setMessageToLearner(e.target.value)}
                  readOnly={!canEdit}
                  className={`session-feedback-textarea${
                    !canEdit ? " session-feedback-textarea--readonly" : ""
                  }`}
                />
              </label>

              <label className="session-feedback-field">
                <span className="session-feedback-label">
                  Comments on the session
                </span>
                <textarea
                  rows={4}
                  value={commentsOnSession}
                  onChange={(e) => setCommentsOnSession(e.target.value)}
                  readOnly={!canEdit}
                  className={`session-feedback-textarea${
                    !canEdit ? " session-feedback-textarea--readonly" : ""
                  }`}
                />
              </label>
            </div>

            <label className="session-feedback-field">
              <span className="session-feedback-label">Future steps</span>
              <textarea
                rows={4}
                value={futureSteps}
                onChange={(e) => setFutureSteps(e.target.value)}
                readOnly={!canEdit}
                className={`session-feedback-textarea${
                  !canEdit ? " session-feedback-textarea--readonly" : ""
                }`}
              />
            </label>

            {canEdit && (
              <div className="session-feedback-actions">
                <button
                  className="btn btn--primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save feedback"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
