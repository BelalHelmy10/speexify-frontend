// web/src/pages/Dashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Dashboard - Premium Edition:
// - Animated KPI cards with gradient accents
// - Enhanced next session card with visual hierarchy
// - Beautiful upcoming sessions with hover effects
// - Smooth transitions and micro-interactions
// - Glass-morphism modal with backdrop blur
// Styling lives in web/src/styles/Dashboard.scss (imported via global.scss)
// ─────────────────────────────────────────────────────────────────────────────
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useAuth from "../hooks/useAuth";
import api from "../lib/api";
import { fmtInTz } from "../utils/date";
import { getSafeExternalUrl } from "../utils/url";

/* ────────────────────────────────────────────────────────────────────────────
   Utilities
   ──────────────────────────────────────────────────────────────────────────── */

const fmt = (d) =>
  new Date(d).toLocaleString([], {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const canJoin = (startAt, endAt, windowMins = 15) => {
  const now = new Date();
  const start = new Date(startAt);
  const end = endAt
    ? new Date(endAt)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const early = new Date(start.getTime() - windowMins * 60 * 1000);
  return now >= early && now <= end;
};

const useCountdown = (startAt, endAt) => {
  const [now, setNow] = useState(Date.now());
  const timer = useRef(null);

  useEffect(() => {
    timer.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer.current);
  }, []);

  if (!startAt) return "";

  const start = new Date(startAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : start + 60 * 60 * 1000;

  if (now < start) {
    let remaining = Math.max(0, Math.floor((start - now) / 1000));
    const days = Math.floor(remaining / 86400);
    remaining %= 86400;
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`);
    parts.push(`${String(secs).padStart(2, "0")}s`);

    return `Starts in ${parts.join(" ")}`;
  }

  if (now >= start && now <= end) return "Live";

  return "Ended";
};

/* ────────────────────────────────────────────────────────────────────────────
   Session row (one item in upcoming/past lists)
   ──────────────────────────────────────────────────────────────────────────── */

function SessionRow({
  s,
  timezone,
  onCancel,
  onRescheduleClick,
  isUpcoming = true,
}) {
  const countdown = useCountdown(s.startAt, s.endAt);
  const joinable = canJoin(s.startAt, s.endAt);

  return (
    <div className="session-item">
      <div className="session-item__indicator"></div>
      <div className="session-item__content">
        <div className="session-item__main">
          <div className="session-item__title">{s.title || "Session"}</div>
          <div className="session-item__meta">
            <span className="session-item__time">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {fmtInTz(s.startAt, timezone)}
              {s.endAt ? ` — ${fmt(s.endAt)}` : ""}
            </span>
            {s.status && (
              <span className={`badge badge--${s.status}`}>{s.status}</span>
            )}
            {!isUpcoming && typeof s.feedbackScore === "number" && (
              <span className="badge badge--feedback">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {s.feedbackScore}/5
              </span>
            )}
          </div>
        </div>

        <div className="session-item__actions">
          {isUpcoming ? (
            <>
              {s.meetingUrl && (
                <a
                  href={getSafeExternalUrl(s.meetingUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className={`btn ${
                    joinable ? "btn--primary btn--glow" : "btn--ghost"
                  }`}
                  title={
                    joinable ? "Join now" : "Join becomes active near start"
                  }
                >
                  {joinable ? (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Join session
                    </>
                  ) : (
                    countdown || "Join soon"
                  )}
                </a>
              )}

              <button
                className="btn btn--ghost"
                onClick={() => onRescheduleClick(s)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 19H6.931A1.922 1.922 0 015 17.087V8h12v3M15 3v4M9 3v4M3 10h16M18 21v-6M15 18h6" />
                </svg>
                Reschedule
              </button>

              <button
                className="btn btn--ghost btn--danger"
                onClick={() => onCancel(s)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <Link href={`/sessions/${s.id}`} className="btn btn--ghost">
              View details
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Modal with glass-morphism
   ──────────────────────────────────────────────────────────────────────────── */

function Modal({ title, children, onClose }) {
  return (
    <div className="modal">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__dialog">
        <div className="modal__head">
          <h4>{title}</h4>
          <button className="modal__close btn btn--ghost" onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Main component
   ──────────────────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const [status, setStatus] = useState("Loading...");
  const [summary, setSummary] = useState(null);

  const { user, checking } = useAuth();
  const [teachSummary, setTeachSummary] = useState({
    nextTeach: null,
    upcomingTeachCount: 0,
    taughtCount: 0,
  });

  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);

  const [reschedOpen, setReschedOpen] = useState(false);
  const [reschedSession, setReschedSession] = useState(null);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const fetchSummary = async () => {
    try {
      const res = await api.get("/api/me/summary");
      setSummary(res.data);
      setStatus("");
    } catch (e) {
      setStatus(e.response?.data?.error || "Failed to load dashboard");
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (!user || user.role !== "teacher") return;
    (async () => {
      try {
        const { data } = await api.get("/api/teacher/summary");
        setTeachSummary({
          nextTeach: data?.nextTeach || null,
          upcomingTeachCount: data?.upcomingTeachCount || 0,
          taughtCount: data?.taughtCount || 0,
        });
      } catch (e) {
        console.warn(
          "teacher summary failed",
          e?.response?.data || e?.message || e
        );
        setTeachSummary({
          nextTeach: null,
          upcomingTeachCount: 0,
          taughtCount: 0,
        });
      }
    })();
  }, [user]);

  const fetchSessions = async () => {
    try {
      const [u, p] = await Promise.all([
        api.get("/api/me/sessions", {
          params: { range: "upcoming", limit: 10 },
        }),
        api.get("/api/me/sessions", {
          params: { range: "past", limit: 10 },
        }),
      ]);

      const pickList = (payload, preferredKey) => {
        const d = payload?.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.[preferredKey])) return d[preferredKey];
        if (Array.isArray(d?.sessions)) return d.sessions;
        if (Array.isArray(d?.data)) return d.data;
        return [];
      };

      setUpcoming(pickList(u, "upcoming"));
      setPast(pickList(p, "past"));
    } catch (e) {
      console.warn(
        "sessions fetch failed",
        e?.response?.data || e?.message || e
      );
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCancel = async (s) => {
    if (!window.confirm("Cancel this session?")) return;
    try {
      await api.post(`/api/sessions/${s.id}/cancel`);
      await Promise.all([fetchSessions(), fetchSummary()]);
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to cancel");
    }
  };

  const openReschedule = (s) => {
    setReschedSession(s);
    const toLocalInput = (iso) => new Date(iso).toISOString().slice(0, 16);
    setNewStart(toLocalInput(s.startAt));
    setNewEnd(s.endAt ? toLocalInput(s.endAt) : "");
    setReschedOpen(true);
  };

  const submitReschedule = async () => {
    if (!reschedSession) return;
    try {
      await api.post(`/api/sessions/${reschedSession.id}/reschedule`, {
        startAt: new Date(newStart).toISOString(),
        endAt: newEnd ? new Date(newEnd).toISOString() : null,
      });
      setReschedOpen(false);
      setReschedSession(null);
      await Promise.all([fetchSessions(), fetchSummary()]);
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to reschedule");
    }
  };

  if (status) return <p className="loading-state">{status}</p>;
  if (!summary) return null;

  const visibleNext =
    summary?.nextSession?.status === "canceled" ? null : summary?.nextSession;

  const { upcomingCount, completedCount } = summary;

  return (
    <div className="container-narrow dashboard">
      <div className="dashboard__header">
        <div>
          <h2>Dashboard</h2>
          <p className="dashboard__subtitle">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
      </div>

      <div className="grid-3">
        <Card
          title="Upcoming"
          value={upcomingCount}
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          gradient="blue"
        />
        <Card
          title="Completed"
          value={completedCount}
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          gradient="green"
        />
        <Card
          title="Total"
          value={upcomingCount + completedCount}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          }
          gradient="purple"
        />
      </div>

      {user?.role === "teacher" && (
        <div className="panel panel--featured">
          <div className="panel__badge">Teaching</div>
          <h3>Next session to teach</h3>
          {!teachSummary.nextTeach ? (
            <div className="empty-state">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p>No upcoming teaching sessions.</p>
            </div>
          ) : (
            <>
              <div className="next-session">
                <div className="next-session__title">
                  {teachSummary.nextTeach.title}
                </div>
                <div className="next-session__time">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {fmtInTz(teachSummary.nextTeach.startAt, summary?.timezone)}
                  {teachSummary.nextTeach.endAt
                    ? ` — ${fmt(teachSummary.nextTeach.endAt)}`
                    : ""}
                </div>
                <div className="next-session__learner">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {teachSummary.nextTeach.user?.name
                    ? `${teachSummary.nextTeach.user.name} — ${teachSummary.nextTeach.user.email}`
                    : teachSummary.nextTeach.user?.email || "—"}
                </div>
              </div>
              <div className="button-row">
                {teachSummary.nextTeach.meetingUrl &&
                canJoin(
                  teachSummary.nextTeach.startAt,
                  teachSummary.nextTeach.endAt
                ) ? (
                  <a
                    href={teachSummary.nextTeach.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn--primary btn--glow"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Join session
                  </a>
                ) : (
                  <Link href="/calendar" className="btn btn--ghost">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    View calendar
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="panel panel--featured">
        <div className="panel__badge">Learning</div>
        <h3>Next session</h3>
        {!visibleNext ? (
          <div className="empty-state">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p>No upcoming sessions yet.</p>
          </div>
        ) : (
          <>
            <div className="next-session">
              <div className="next-session__title">{visibleNext.title}</div>
              <div className="next-session__time">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {fmtInTz(visibleNext.startAt, summary?.timezone)}
                {visibleNext.endAt ? ` — ${fmt(visibleNext.endAt)}` : ""}
              </div>
            </div>
            <div className="button-row">
              {visibleNext.meetingUrl &&
              canJoin(visibleNext.startAt, visibleNext.endAt) ? (
                <a
                  href={visibleNext.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--primary btn--glow"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Join session
                </a>
              ) : (
                <Link href="/calendar" className="btn btn--ghost">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  View calendar
                </Link>
              )}
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <div className="panel__head">
          <h3>Upcoming sessions</h3>
          <Link href="/calendar" className="btn btn--ghost btn--sm">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Open calendar
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No upcoming sessions.</p>
          </div>
        ) : (
          <div className="session-list">
            {upcoming.map((s) => (
              <SessionRow
                key={s.id}
                s={s}
                timezone={summary?.timezone}
                isUpcoming
                onCancel={handleCancel}
                onRescheduleClick={openReschedule}
              />
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel__head">
          <h3>Past sessions</h3>
          <Link href="/calendar" className="btn btn--ghost btn--sm">
            View all
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>
        {past.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No past sessions.</p>
          </div>
        ) : (
          <div className="session-list">
            {past.map((s) => (
              <SessionRow
                key={s.id}
                s={s}
                timezone={summary?.timezone}
                isUpcoming={false}
                onCancel={() => {}}
                onRescheduleClick={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {reschedOpen && (
        <Modal title="Reschedule session" onClose={() => setReschedOpen(false)}>
          <div className="form-grid">
            <label>
              <span>Start time</span>
              <input
                type="datetime-local"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
              />
            </label>
            <label>
              <span>End time</span>
              <input
                type="datetime-local"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
              />
            </label>
          </div>
          <div className="button-row">
            <button
              className="btn btn--ghost"
              onClick={() => setReschedOpen(false)}
            >
              Cancel
            </button>
            <button className="btn btn--primary" onClick={submitReschedule}>
              Save changes
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   KPI card with gradient accent
   ──────────────────────────────────────────────────────────────────────────── */
function Card({ title, value, icon, gradient }) {
  return (
    <div className={`card card--kpi card--${gradient}`}>
      <div className="card__icon">{icon}</div>
      <div className="card__content">
        <div className="card__title">{title}</div>
        <div className="card__value">{value}</div>
      </div>
    </div>
  );
}
