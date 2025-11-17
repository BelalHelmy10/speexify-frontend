"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";

export default function SessionDetailPage({ params }) {
  const router = useRouter();
  const { id } = params; // /dashboard/sessions/[id]

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

  if (status === "loading") {
    return (
      <div className="container-narrow page-session-detail">
        <button
          onClick={handleBack}
          className="btn btn--ghost"
          style={{ marginTop: 16 }}
        >
          ← Back
        </button>
        <h2 style={{ marginTop: 24 }}>Loading session…</h2>
      </div>
    );
  }

  if (status === "error" || !session) {
    return (
      <div className="container-narrow page-session-detail">
        <button
          onClick={handleBack}
          className="btn btn--ghost"
          style={{ marginTop: 16 }}
        >
          ← Back
        </button>
        <h2 style={{ marginTop: 24 }}>Session not available</h2>
        <p style={{ marginTop: 8, color: "#b91c1c" }}>
          {error || "Could not load session."}
        </p>
      </div>
    );
  }

  const {
    title,
    startAt,
    endAt,
    meetingUrl,
    notes,
    user,
    teacher,
    status: s,
    feedbackScore,
  } = session;

  return (
    <div className="container-narrow page-session-detail">
      <button
        onClick={handleBack}
        className="btn btn--ghost"
        style={{ marginTop: 16 }}
      >
        ← Back
      </button>

      <header className="session-header" style={{ marginTop: 24 }}>
        <h1>{title || "Session details"}</h1>
        {s && <span className={`badge badge--${s}`}>{s}</span>}
      </header>

      <section className="session-section">
        <h3>Time</h3>
        <p>
          <strong>Start:</strong> {formatDateTime(startAt)}
          <br />
          <strong>End:</strong> {formatDateTime(endAt)}
        </p>
      </section>

      <section className="session-section">
        <h3>Teacher</h3>
        {teacher ? (
          <p>
            {teacher.name || teacher.email}
            <br />
            <small>{teacher.email}</small>
          </p>
        ) : (
          <p>Not assigned</p>
        )}
      </section>

      <section className="session-section">
        <h3>Learner</h3>
        {user ? (
          <p>
            {user.name || user.email}
            <br />
            <small>{user.email}</small>
          </p>
        ) : (
          <p>Not found</p>
        )}
      </section>

      <section className="session-section">
        <h3>Join link</h3>
        {meetingUrl ? (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn--primary"
          >
            Join session
          </a>
        ) : (
          <p>No join link set yet.</p>
        )}
      </section>

      <section className="session-section">
        <h3>Notes / Homework</h3>
        {notes ? <p>{notes}</p> : <p>No notes added yet.</p>}
      </section>

      {typeof feedbackScore === "number" && (
        <section className="session-section">
          <h3>Feedback</h3>
          <p>Rating: {feedbackScore}/5</p>
        </section>
      )}
    </div>
  );
}
