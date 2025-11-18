// app/dashboard/page.jsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import api from "@/lib/api";
import { fmtInTz } from "@/utils/date";
import { getSafeExternalUrl } from "@/utils/url";
import { useToast } from "@/components/ToastProvider";

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

function SessionRow({
  s,
  timezone,
  onCancel,
  onRescheduleClick,
  isUpcoming = true,
  isTeacher = false,
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
                  {joinable ? <>Join session</> : countdown || "Join soon"}
                </a>
              )}
              <button
                className="btn btn--ghost"
                onClick={() => onRescheduleClick(s)}
              >
                Reschedule
              </button>
              <button
                className="btn btn--ghost btn--danger"
                onClick={() => onCancel(s)}
                title="Cancel session"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/dashboard/sessions/${s.id}`}
                className="btn btn--ghost"
              >
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

              {/* Teacher: Give feedback (dedicated page, only if completed & no feedback yet) */}
              {/* Teacher: give OR edit feedback on completed sessions */}
              {isTeacher && s.status === "completed" && (
                <Link
                  href={`/dashboard/sessions/${s.id}/feedback`}
                  className="btn btn--primary"
                >
                  {s.teacherFeedback ? "Edit feedback" : "Give feedback"}
                </Link>
              )}

              {/* Learner: View feedback (only after teacher filled it) */}
              {!isTeacher && s.teacherFeedback && (
                <Link
                  href={`/dashboard/sessions/${s.id}/feedback`}
                  className="btn btn--primary"
                >
                  View feedback
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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

export default function Dashboard() {
  const { toast, confirmModal } = useToast();
  const [status, setStatus] = useState("Loading…");
  const [summary, setSummary] = useState(null);
  const { user, checking } = useAuth();
  const isTeacher = user?.role === "teacher";

  const [teachSummary, setTeachSummary] = useState({
    nextTeach: null,
    upcomingTeachCount: 0,
    taughtCount: 0,
  });

  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [packs, setPacks] = useState([]);
  const [onboarding, setOnboarding] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [reschedSession, setReschedSession] = useState(null);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get("/me/summary", { params: { t: Date.now() } });
      setSummary(res.data);
      setStatus("");
    } catch (e) {
      setStatus(e?.response?.data?.error || "Failed to load dashboard");
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const [u, p] = await Promise.all([
        api.get("/me/sessions", {
          params: { range: "upcoming", limit: 10, t: Date.now() },
        }),
        api.get("/me/sessions", {
          params: { range: "past", limit: 10, t: Date.now() },
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
        "[dashboard] sessions fetch failed",
        e?.response?.data || e?.message || e
      );
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      const { data } = await api.get("/me/packages", {
        params: { t: Date.now() },
      });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];
      setPacks(list);
    } catch (e) {
      console.warn(
        "[dashboard] packages fetch failed",
        e?.response?.data || e?.message || e
      );
    }
  }, []);

  const fetchOnboarding = useCallback(async () => {
    try {
      const { data } = await api.get("/me/onboarding", {
        params: { t: Date.now() },
      });
      setOnboarding(data || null);
    } catch {}
  }, []);

  const fetchAssessment = useCallback(async () => {
    try {
      const { data } = await api.get("/me/assessment", {
        params: { t: Date.now() },
      });
      setAssessment(data || null);
    } catch {}
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchSummary(), fetchSessions(), fetchPackages()]);
  }, [fetchSummary, fetchSessions, fetchPackages]);

  useEffect(() => {
    if (checking) return;
    if (!user) {
      setStatus("Not authenticated");
      return;
    }
    refreshAll();
    fetchOnboarding();
    fetchAssessment();
  }, [checking, user, refreshAll, fetchOnboarding, fetchAssessment]);

  // Teacher summary
  useEffect(() => {
    if (checking || !user) return;
    (async () => {
      try {
        const { data } = await api.get("/teacher/summary", {
          params: { t: Date.now() },
        });
        setTeachSummary({
          nextTeach: data?.nextTeach || null,
          upcomingTeachCount: data?.upcomingTeachCount || 0,
          taughtCount: data?.taughtCount || 0,
        });
      } catch {
        setTeachSummary({
          nextTeach: null,
          upcomingTeachCount: 0,
          taughtCount: 0,
        });
      }
    })();
  }, [checking, user]);

  // Keep fresh when tab regains focus / becomes visible
  useEffect(() => {
    const onFocus = () => refreshAll();
    const onVis = () => {
      if (document.visibilityState === "visible") refreshAll();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshAll]);

  const handleCancel = async (s) => {
    const ok = await confirmModal("Cancel this session?");
    if (!ok) return;
    try {
      await api.post(`/sessions/${s.id}/cancel`);
      await refreshAll();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to cancel");
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
      await api.post(`/sessions/${reschedSession.id}/reschedule`, {
        startAt: new Date(newStart).toISOString(),
        endAt: newEnd ? new Date(newEnd).toISOString() : null,
      });
      setReschedOpen(false);
      setReschedSession(null);
      await refreshAll();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to reschedule");
    }
  };

  if (status) return <p className="loading-state">{status}</p>;
  if (!summary) return null;

  const visibleNext =
    summary?.nextSession?.status === "canceled" ? null : summary?.nextSession;
  const { upcomingCount, completedCount, timezone } = summary;

  const activePacks = packs.filter((p) => p.status === "active" && !p.expired);
  const totalSessions = activePacks.reduce(
    (s, p) => s + Number(p.sessionsTotal || 0),
    0
  );
  const usedSessions = activePacks.reduce(
    (s, p) => s + Number(p.sessionsUsed || 0),
    0
  );
  const remainingSessions = Math.max(0, totalSessions - usedSessions);
  const progressPct =
    totalSessions > 0
      ? Math.min(100, Math.round((remainingSessions / totalSessions) * 100))
      : 0;

  const primaryPack = activePacks[0];
  const expiryLabel = primaryPack?.expiresAt
    ? new Date(primaryPack.expiresAt).toLocaleDateString()
    : null;

  const outOfCredits = remainingSessions <= 0;

  const onbComplete = !!onboarding;
  const assComplete = !!assessment;
  const pendingActionsCount = [!onbComplete, !assComplete].filter(
    Boolean
  ).length;

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
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          }
          gradient="purple"
        />
      </div>

      {outOfCredits && (
        <div
          className="panel panel--warning"
          style={{ borderLeft: "4px solid #f59e0b" }}
        >
          <div
            className="panel__badge"
            style={{ background: "#fff7ed", color: "#9a3412" }}
          >
            Action needed
          </div>
          <h3 style={{ marginTop: 8 }}>You're out of session credits</h3>
          <p style={{ margin: "6px 0 12px", opacity: 0.9 }}>
            Purchase a package to book your next session.
          </p>
          <div className="button-row">
            <Link href="/packages" className="btn btn--primary">
              Browse packages
            </Link>
          </div>
        </div>
      )}

      <div className="panel panel--featured">
        <div className="panel__badge">Your plan</div>

        {activePacks.length === 0 ? (
          <div className="empty-state">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <p>No active packages yet.</p>
            <div className="button-row">
              <Link href="/packages" className="btn btn--primary">
                Browse packages
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h3 className="next-session__title">
              {primaryPack?.title || "Your plan"}
            </h3>
            <div className="next-session__time" style={{ marginTop: 6 }}>
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
              {primaryPack?.minutesPerSession
                ? `${primaryPack.minutesPerSession} min / session`
                : "Flexible duration"}
              {expiryLabel ? ` · Expires ${expiryLabel}` : ""}
            </div>

            <div className="progress" style={{ margin: "16px 0 8px" }}>
              <div
                className="progress__bar"
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: "var(--surface-3, #eef1f4)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: "100%",
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg, rgba(58,123,213,1) 0%, rgba(58,213,180,1) 100%)",
                    transition: "width .3s ease",
                  }}
                />
              </div>
              <div
                className="progress__label"
                style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}
              >
                {remainingSessions} of {totalSessions} sessions remaining
              </div>
            </div>

            {pendingActionsCount > 0 && (
              <div className="alert-badge">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {pendingActionsCount === 2
                  ? "2 required actions"
                  : "1 required action"}
              </div>
            )}

            <div className="button-row" style={{ gap: 12, flexWrap: "wrap" }}>
              <Link
                href="/onboarding"
                className={`btn ${
                  onbComplete ? "btn--ghost" : "btn--primary btn--pulse"
                }`}
              >
                {!onbComplete && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4m0 4h.01" />
                  </svg>
                )}
                {onbComplete ? "View onboarding" : "Complete onboarding form"}
              </Link>

              <Link
                href="/assessment"
                className={`btn ${
                  assComplete ? "btn--ghost" : "btn--primary btn--pulse"
                }`}
              >
                {!assComplete && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4m0 4h.01" />
                  </svg>
                )}
                {assComplete ? "View assessment" : "Take written assessment"}
              </Link>

              <Link href="/packages" className="btn btn--ghost">
                View all plans
              </Link>
            </div>
          </>
        )}
      </div>

      {isTeacher && (
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
                  {fmtInTz(teachSummary.nextTeach.startAt, timezone)}
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
                    href={getSafeExternalUrl(teachSummary.nextTeach.meetingUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn--primary btn--glow"
                  >
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
                timezone={timezone}
                isUpcoming
                onCancel={handleCancel}
                onRescheduleClick={openReschedule}
                isTeacher={isTeacher}
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
                timezone={timezone}
                isUpcoming={false}
                onCancel={() => {}}
                onRescheduleClick={() => {}}
                isTeacher={isTeacher}
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
