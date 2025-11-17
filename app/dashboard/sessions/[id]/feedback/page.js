"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import api from "@/lib/api";

export default function SessionFeedbackPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, checking } = useAuth();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");

  const [messageToLearner, setMessageToLearner] = useState("");
  const [commentsOnSession, setCommentsOnSession] = useState("");
  const [futureSteps, setFutureSteps] = useState("");

  const [saving, setSaving] = useState(false);

  const isTeacher = session && user && session.teacherId === user.id;
  const canEdit = isTeacher || (user && user.role === "admin");

  useEffect(() => {
    if (!id || checking) return;
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [sRes, fRes] = await Promise.all([
          api.get(`/sessions/${id}`),
          api.get(`/sessions/${id}/feedback`),
        ]);

        setSession(sRes.data || null);
        setFeedback(fRes.data || null);

        if (fRes.data) {
          setMessageToLearner(fRes.data.messageToLearner || "");
          setCommentsOnSession(fRes.data.commentsOnSession || "");
          setFutureSteps(fRes.data.futureSteps || "");
        }

        setLoading(false);
      } catch (e) {
        console.error(e);
        setError(e?.response?.data?.error || "Failed to load session/feedback");
        setLoading(false);
      }
    })();
  }, [id, checking, user]);

  const onSave = async () => {
    try {
      setSaving(true);
      setError("");
      await api.post(`/sessions/${id}/feedback`, {
        messageToLearner,
        commentsOnSession,
        futureSteps,
      });
      setSaving(false);
      router.push(`/dashboard/sessions/${id}`);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || "Failed to save feedback");
      setSaving(false);
    }
  };

  if (checking || loading)
    return <div className="container-narrow">Loading…</div>;
  if (error) return <div className="container-narrow error-text">{error}</div>;
  if (!session)
    return <div className="container-narrow">Session not found.</div>;

  return (
    <div className="container-narrow">
      <button
        className="btn btn--ghost"
        onClick={() => router.push(`/dashboard/sessions/${id}`)}
        style={{ marginBottom: 16 }}
      >
        ← Back to session
      </button>

      <h2>Session feedback</h2>
      <p style={{ opacity: 0.8, marginTop: 4 }}>
        {session.title || "Session"} ·{" "}
        {new Date(session.startAt).toLocaleString()}
      </p>

      {!canEdit && (
        <p style={{ marginTop: 16, fontStyle: "italic", opacity: 0.8 }}>
          This feedback is read-only. Only the teacher can edit it.
        </p>
      )}

      <div className="panel" style={{ marginTop: 24 }}>
        <div className="form-grid">
          <label>
            <span>Message to the learner</span>
            <textarea
              rows={4}
              value={messageToLearner}
              onChange={(e) => setMessageToLearner(e.target.value)}
              disabled={!canEdit}
            />
          </label>

          <label>
            <span>Comments on the session</span>
            <textarea
              rows={4}
              value={commentsOnSession}
              onChange={(e) => setCommentsOnSession(e.target.value)}
              disabled={!canEdit}
            />
          </label>

          <label>
            <span>Future steps</span>
            <textarea
              rows={4}
              value={futureSteps}
              onChange={(e) => setFutureSteps(e.target.value)}
              disabled={!canEdit}
            />
          </label>
        </div>

        {canEdit && (
          <div className="button-row" style={{ marginTop: 16 }}>
            <button
              className="btn btn--ghost"
              onClick={() => router.push(`/dashboard/sessions/${id}`)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="btn btn--primary"
              onClick={onSave}
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
