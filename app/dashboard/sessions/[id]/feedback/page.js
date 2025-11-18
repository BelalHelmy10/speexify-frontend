// app/dashboard/sessions/[id]/feedback/page.jsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/components/ToastProvider";

export default function SessionFeedbackPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const { user, checking } = useAuth();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Feedback fields
  const [messageToLearner, setMessageToLearner] = useState("");
  const [commentsOnSession, setCommentsOnSession] = useState("");
  const [futureSteps, setFutureSteps] = useState("");

  const isTeacher = user?.role === "teacher";
  const toast = useToast();

  const canEdit = useMemo(() => {
    if (!session) return false;
    // Teacher only; you can also require status === "completed" if you like:
    // return isTeacher && session.status === "completed";
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

  if (checking || loading) {
    return (
      <div className="container-narrow page-session-detail">
        <button
          onClick={handleBack}
          className="btn btn--ghost"
          style={{ marginTop: 16 }}
        >
          ← Back to session
        </button>
        <h2 style={{ marginTop: 24 }}>Loading feedback…</h2>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container-narrow page-session-detail">
        <button
          onClick={handleBack}
          className="btn btn--ghost"
          style={{ marginTop: 16 }}
        >
          ← Back to session
        </button>
        <h2 style={{ marginTop: 24 }}>Session not found</h2>
        {error && (
          <p style={{ marginTop: 8, color: "#b91c1c" }}>
            {error || "Could not load session."}
          </p>
        )}
      </div>
    );
  }

  const sessionDateLabel = formatSessionDate();

  return (
    <div className="container-narrow page-session-detail">
      <button
        onClick={handleBack}
        className="btn btn--ghost"
        style={{ marginTop: 16 }}
      >
        ← Back to session
      </button>

      <header style={{ marginTop: 24, marginBottom: 16 }}>
        <h1>Session feedback</h1>
        <p style={{ marginTop: 4, opacity: 0.8 }}>
          Session
          {sessionDateLabel ? ` · ${sessionDateLabel}` : ""}
        </p>

        <p
          style={{
            marginTop: 8,
            fontStyle: "italic",
            opacity: 0.8,
          }}
        >
          {canEdit
            ? "You can edit and save feedback for this session. The learner will see it as read-only."
            : "This feedback is read-only. Only the teacher can edit it."}
        </p>
      </header>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: "#fef2f2",
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      <div
        className="panel"
        style={{
          padding: 24,
          borderRadius: 16,
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          className="form-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginBottom: 16,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span>Message to the learner</span>
            <textarea
              rows={4}
              value={messageToLearner}
              onChange={(e) => setMessageToLearner(e.target.value)}
              readOnly={!canEdit}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span>Comments on the session</span>
            <textarea
              rows={4}
              value={commentsOnSession}
              onChange={(e) => setCommentsOnSession(e.target.value)}
              readOnly={!canEdit}
            />
          </label>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span>Future steps</span>
          <textarea
            rows={4}
            value={futureSteps}
            onChange={(e) => setFutureSteps(e.target.value)}
            readOnly={!canEdit}
          />
        </label>

        {canEdit && (
          <div className="button-row" style={{ marginTop: 20 }}>
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
  );
}
