"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

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
      <div className="page page-session-detail">
        <button onClick={handleBack} className="btn btn-link">
          ← Back
        </button>
        <h1>Loading session…</h1>
      </div>
    );
  }

  if (status === "error" || !session) {
    return (
      <div className="page page-session-detail">
        <button onClick={handleBack} className="btn btn-link">
          ← Back
        </button>
        <h1>Session not available</h1>
        <p className="text-danger">{error || "Could not load session."}</p>
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
  } = session;

  return (
    <div className="page page-session-detail">
      <button onClick={handleBack} className="btn btn-link">
        ← Back
      </button>

      <header className="session-header">
        <h1>{title || "Session details"}</h1>
        {s && <span className={`badge badge-status-${s}`}>{s}</span>}
      </header>

      <section className="session-section">
        <h2>Time</h2>
        <p>
          <strong>Start:</strong> {formatDateTime(startAt)}
          <br />
          <strong>End:</strong> {formatDateTime(endAt)}
        </p>
      </section>

      <section className="session-section">
        <h2>Teacher</h2>
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
        <h2>Learner</h2>
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
        <h2>Join link</h2>
        {meetingUrl ? (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            Join session
          </a>
        ) : (
          <p>No join link set yet.</p>
        )}
      </section>

      <section className="session-section">
        <h2>Notes / Homework</h2>
        {notes ? <p>{notes}</p> : <p>No notes added yet.</p>}
      </section>
    </div>
  );
}
