// app/dashboard/page.js
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import api, { clearCsrfToken } from "@/lib/api";
import { fmtInTz } from "@/utils/date";
import { getSafeExternalUrl } from "@/utils/url";
import { useToast } from "@/components/ToastProvider";
import { getDictionary, t } from "@/app/i18n";

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

const useCountdown = (startAt, endAt, labels = {}) => {
  const { startsIn = "Starts in", live = "Live", ended = "Ended" } = labels;

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

    return `${startsIn} ${parts.join(" ")}`;
  }

  if (now >= start && now <= end) return live;

  return ended;
};

function SessionRow({
  s,
  timezone,
  onCancel,
  onRescheduleClick,
  isUpcoming = true,
  isTeacher = false,
  isAdmin = false,
  isImpersonating = false,
  dict,
  prefix,
}) {
  const countdown = useCountdown(s.startAt, s.endAt, {
    startsIn: t(dict, "countdown_starts_in"),
    live: t(dict, "countdown_live"),
    ended: t(dict, "countdown_ended"),
  });

  const joinable = canJoin(s.startAt, s.endAt);

  const isGroup = String(s.type || "").toUpperCase() === "GROUP";
  const participantCount =
    typeof s.participantCount === "number" ? s.participantCount : null;

  // When impersonating, admin can reschedule on behalf of user
  const canReschedule = isTeacher || isAdmin || isImpersonating;

  const cancelLabel =
    isGroup && !isTeacher && !isAdmin && !isImpersonating
      ? t(dict, "session_leave") || "Leave session"
      : t(dict, "session_cancel") || "Cancel";

  const cancelTitle =
    isGroup && !isTeacher && !isAdmin && !isImpersonating
      ? t(dict, "session_leave_title") || "Leave this group session"
      : t(dict, "session_cancel_title") || "Cancel session";

  return (
    <div className="session-item">
      <div className="session-item__indicator"></div>
      <div className="session-item__content">
        <div className="session-item__main">
          <div className="session-item__title">
            {s.title || t(dict, "session_title_default")}
          </div>

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
              {s.endAt ? ` — ${fmtInTz(s.endAt, timezone)}` : ""}
            </span>

            {isGroup && (
              <span className="badge badge--info">
                {t(dict, "session_group") || "Group"}
              </span>
            )}

            {(participantCount !== null || (isGroup && s.capacity)) && (
              <span className="badge badge--neutral">
                {t(dict, "session_participants") || "Participants"}:{" "}
                {participantCount !== null ? participantCount : 0}
                {isGroup && typeof s.capacity === "number"
                  ? ` / ${s.capacity}`
                  : ""}
              </span>
            )}

            {s.status && (
              <span className={`badge badge--${s.status}`}>{s.status}</span>
            )}
          </div>
        </div>

        <div className="session-item__actions">
          {isUpcoming ? (
            <>
              {/* Countdown should go to Session page (details hub) */}
              <Link
                href={`${prefix}/dashboard/sessions/${s.id}`}
                className="btn btn--ghost"
                title={
                  t(dict, "session_view_details") || "View session details"
                }
              >
                {countdown || t(dict, "session_view_details") || "View session"}
              </Link>

              {/* Join appears only when joinable */}
              {joinable && (
                <Link
                  href={`/classroom/${s.id}`}
                  className="btn btn--primary btn--glow"
                  title={t(dict, "session_join_classroom") || "Join classroom"}
                >
                  {t(dict, "session_join_classroom") || "Join"}
                </Link>
              )}

              {s.meetingUrl && (
                <a
                  href={getSafeExternalUrl(s.meetingUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--ghost"
                  title={t(dict, "session_external_link")}
                >
                  {t(dict, "session_external_link")}
                </a>
              )}

              {canReschedule && (
                <button
                  className="btn btn--ghost"
                  onClick={() => onRescheduleClick(s)}
                >
                  {t(dict, "session_reschedule")}
                </button>
              )}

              <button
                className="btn btn--ghost btn--danger"
                onClick={() => onCancel(s)}
                title={cancelTitle}
              >
                {cancelLabel}
              </button>
            </>
          ) : (
            <>
              <Link
                href={`${prefix}/dashboard/sessions/${s.id}`}
                className="btn btn--ghost"
              >
                {t(dict, "session_view_details")}
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

              {isTeacher && s.status === "completed" && (
                <Link
                  href={`${prefix}/dashboard/sessions/${s.id}/feedback`}
                  className="btn btn--primary"
                >
                  {s.teacherFeedback
                    ? t(dict, "session_edit_feedback")
                    : t(dict, "session_give_feedback")}
                </Link>
              )}

              {!isTeacher && s.teacherFeedback && (
                <Link
                  href={`${prefix}/dashboard/sessions/${s.id}/feedback`}
                  className="btn btn--primary"
                >
                  {t(dict, "session_view_feedback")}
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

/* ═══════════════════════════════════════════════════════════════════════════
   IMPERSONATION BANNER COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
function ImpersonationBanner({ user, onStop }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        color: "#fff",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M12 14l-3-3m3 3l3-3" />
        </svg>
        <div>
          <strong style={{ display: "block", fontSize: "14px" }}>
            👁️ Viewing as: {user?.name || user?.email}
          </strong>
          <span style={{ fontSize: "12px", opacity: 0.9 }}>
            Role: {user?.role} • You are impersonating this user
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "12px" }}>
        <Link
          href="/calendar"
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          📅 View Calendar
        </Link>
        <button
          onClick={onStop}
          style={{
            background: "#fff",
            color: "#d97706",
            border: "none",
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          ✕ Stop Impersonating
        </button>
      </div>
    </div>
  );
}

function DashboardInner({ dict, prefix }) {
  const { toast, confirmModal } = useToast();
  const router = useRouter();

  const searchParams = useSearchParams();
  const notice = searchParams.get("notice");

  const [status, setStatus] = useState(() => t(dict, "status_loading"));
  const [summary, setSummary] = useState(null);
  const { user, checking, refresh } = useAuth();
  // ...

  // ─────────────────────────────────────────────
  // IMPERSONATION DETECTION
  // ─────────────────────────────────────────────
  const isImpersonating = !!user?._impersonating;
  const realAdminRole = user?._adminRole; // The actual admin's role

  // Role checks - when impersonating, use the impersonated user's role for display
  // but allow admin-level actions
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin" && !isImpersonating; // Real admin (not impersonating)
  const isLearner = !!user && !isTeacher && !isAdmin;

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

  // ─────────────────────────────────────────────
  // STOP IMPERSONATION HANDLER
  // ─────────────────────────────────────────────
  const handleStopImpersonate = async () => {
    try {
      await api.post("/admin/impersonate/stop");
      clearCsrfToken();
      toast.success("Stopped viewing as user");
      // Redirect back to admin page and refresh
      router.push("/admin");
      setTimeout(() => window.location.reload(), 100);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to stop impersonation");
    }
  };

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get("/me/summary", { params: { t: Date.now() } });
      setSummary(res.data);
      setStatus("");
    } catch (e) {
      setStatus(e?.response?.data?.error || t(dict, "status_failed"));
    }
  }, [dict]);

  const fetchSessions = useCallback(async () => {
    try {
      const [u, p] = await Promise.all([
        api.get("/me/sessions", {
          params: { range: "upcoming", limit: 20, t: Date.now() },
        }),
        api.get("/me/sessions", {
          params: { range: "past", limit: 20, t: Date.now() },
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
    } catch { }
  }, []);

  const fetchAssessment = useCallback(async () => {
    try {
      const { data } = await api.get("/me/assessment", {
        params: { t: Date.now() },
      });
      setAssessment(data || null);
    } catch { }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchSummary(), fetchSessions(), fetchPackages()]);
  }, [fetchSummary, fetchSessions, fetchPackages]);

  useEffect(() => {
    if (checking) return;
    if (!user) {
      setStatus(t(dict, "status_not_auth"));
      return;
    }

    // ─────────────────────────────────────────────
    // FIXED: When impersonating, DO fetch user data (we want to see their view)
    // Only skip for real admins who are NOT impersonating
    // ─────────────────────────────────────────────
    if (isAdmin && !isImpersonating) {
      // Real admin dashboard (not impersonating) - don't use learner endpoints
      setSummary({
        nextSession: null,
        upcomingCount: 0,
        completedCount: 0,
        timezone: user?.timezone || null,
      });
      setUpcoming([]);
      setPast([]);
      setPacks([]);
      setOnboarding(null);
      setAssessment(null);
      setStatus("");
      return;
    }

    // When impersonating OR for regular learners/teachers - fetch their data
    refreshAll();

    // Only learners have onboarding + assessment
    if (isLearner || (isImpersonating && user?.role === "learner")) {
      fetchOnboarding();
      fetchAssessment();
    }
  }, [
    checking,
    user,
    isAdmin,
    isLearner,
    isImpersonating,
    refreshAll,
    fetchOnboarding,
    fetchAssessment,
    dict,
  ]);

  useEffect(() => {
    if (!notice) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    window.history.replaceState({}, "", url.toString());
  }, [notice]);

  // Teacher summary - fetch for teachers OR when impersonating a teacher
  useEffect(() => {
    if (checking || !user) return;
    if (!isTeacher && !(isImpersonating && user?.role === "teacher")) return;

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
  }, [checking, user, isTeacher, isImpersonating]);

  // Keep fresh when tab regains focus / becomes visible
  useEffect(() => {
    const onFocus = () => {
      // Refresh for learners, teachers, and when impersonating
      if (!isAdmin || isImpersonating) refreshAll();
    };
    const onVis = () => {
      if (
        document.visibilityState === "visible" &&
        (!isAdmin || isImpersonating)
      ) {
        refreshAll();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshAll, isAdmin, isImpersonating]);

  const handleCancel = async (s) => {
    const isGroup = String(s.type || "").toUpperCase() === "GROUP";
    const title =
      isGroup && !isTeacher && user?.role !== "admin"
        ? t(dict, "session_leave_title") || "Leave this group session?"
        : t(dict, "session_cancel_title") || "Cancel session?";

    const ok = await confirmModal(title);
    if (!ok) return;

    try {
      const res = await api.post(`/sessions/${s.id}/cancel`);
      const scope = res?.data?.scope;

      if (scope === "participant") {
        toast.success(
          t(dict, "session_left_success") || "You left the session."
        );
      } else if (scope === "session") {
        toast.success(
          t(dict, "session_canceled_success") || "Session canceled."
        );
      } else {
        toast.success(t(dict, "success_saved") || "Done.");
      }

      await refreshAll();
    } catch (e) {
      toast.error(e?.response?.data?.error || t(dict, "error_cancel_failed"));
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
      toast.error(
        e?.response?.data?.error || t(dict, "error_reschedule_failed")
      );
    }
  };

  if (status) return <p className="loading-state">{status}</p>;
  if (!summary) return null;

  const visibleNext =
    summary?.nextSession?.status === "canceled" ? null : summary?.nextSession;
  const { upcomingCount, completedCount } = summary;
  const timezone = user?.timezone || summary?.timezone;

  const joinableTeach =
    teachSummary.nextTeach &&
    canJoin(teachSummary.nextTeach.startAt, teachSummary.nextTeach.endAt);

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

  const subtitleText = t(dict, "subtitle", {
    name: user?.name || user?.email || "",
  });

  // Determine if we should show learner-specific content
  const showLearnerContent =
    isLearner || (isImpersonating && user?.role === "learner");
  const showTeacherContent =
    isTeacher || (isImpersonating && user?.role === "teacher");

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          IMPERSONATION BANNER - Shows when admin is viewing as another user
          ═══════════════════════════════════════════════════════════════════ */}
      {isImpersonating && (
        <ImpersonationBanner user={user} onStop={handleStopImpersonate} />
      )}

      <div className="container-narrow dashboard">
        {notice ? (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              border: "1px solid #cde8d5",
              background: "#f3fff6",
              borderRadius: 12,
            }}
          >
            {notice}
          </div>
        ) : null}

        <div className="dashboard__header">
          <div>
            <h2>{t(dict, "title")}</h2>
            <p className="dashboard__subtitle">{subtitleText}</p>

            {isImpersonating && (
              <p
                style={{
                  color: "#d97706",
                  fontSize: "14px",
                  marginTop: "4px",
                  fontWeight: "500",
                }}
              >
                🔍 Admin preview mode - viewing {user?.role}'s dashboard
              </p>
            )}
          </div>
        </div>

        <div className="grid-3">
          <Card
            title={t(dict, "kpi_upcoming")}
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
            title={t(dict, "kpi_completed")}
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
            title={t(dict, "kpi_total")}
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

        {/* ═══════════════════════════════════════════════════════════════════
            FIXED: Out-of-credits warning – learners only, NOT when impersonating
            When admin is impersonating, they should see the full view without restrictions
            ═══════════════════════════════════════════════════════════════════ */}
        {showLearnerContent && outOfCredits && !isImpersonating && (
          <div
            className="panel panel--warning"
            style={{ borderLeft: "4px solid #f59e0b" }}
          >
            <div
              className="panel__badge"
              style={{ background: "#fff7ed", color: "#9a3412" }}
            >
              {t(dict, "warning_action_needed")}
            </div>
            <h3 style={{ marginTop: 8 }}>
              {t(dict, "warning_out_of_credits_title")}
            </h3>
            <p style={{ margin: "6px 0 12px", opacity: 0.9 }}>
              {t(dict, "warning_out_of_credits_body")}
            </p>
            <div className="button-row">
              <Link href={`${prefix}/packages`} className="btn btn--primary">
                {t(dict, "warning_browse_packages")}
              </Link>
            </div>
          </div>
        )}

        {/* Info banner when impersonating a user with no credits */}
        {isImpersonating && outOfCredits && showLearnerContent && (
          <div
            className="panel"
            style={{
              borderLeft: "4px solid #3b82f6",
              background: "#eff6ff",
            }}
          >
            <div
              className="panel__badge"
              style={{ background: "#dbeafe", color: "#1d4ed8" }}
            >
              Admin Info
            </div>
            <h3 style={{ marginTop: 8, color: "#1e40af" }}>
              ℹ️ This user has no remaining credits
            </h3>
            <p style={{ margin: "6px 0 12px", opacity: 0.9, color: "#1e40af" }}>
              The learner would normally see an "out of credits" warning here.
              As an admin, you can see their full dashboard.
            </p>
          </div>
        )}

        {/* Plan / packages panel – learners only (or impersonating learner) */}
        {showLearnerContent && (
          <div className="panel panel--featured">
            <div className="panel__badge">{t(dict, "plan_badge")}</div>

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
                <p>{t(dict, "plan_no_active")}</p>
                <p style={{ opacity: 0.8, marginTop: 4 }}>
                  {t(dict, "plan_no_active_body")}
                </p>
                <div className="button-row">
                  <Link
                    href={`${prefix}/packages`}
                    className="btn btn--primary"
                  >
                    {t(dict, "plan_browse_packages")}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <h3 className="next-session__title">
                  {primaryPack?.title || t(dict, "plan_default_title")}
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
                    : t(dict, "plan_flexible_duration")}
                  {expiryLabel
                    ? ` · ${t(dict, "plan_expires_label")} ${expiryLabel}`
                    : ""}
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
                    {t(dict, "plan_progress_label", {
                      remaining: remainingSessions,
                      total: totalSessions,
                    })}
                  </div>
                </div>

                {pendingActionsCount > 0 && !isImpersonating && (
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
                      ? t(dict, "actions_two")
                      : t(dict, "actions_one")}
                  </div>
                )}

                <div
                  className="button-row"
                  style={{ gap: 12, flexWrap: "wrap" }}
                >
                  <Link
                    href={`${prefix}/onboarding`}
                    className={`btn ${onbComplete ? "btn--ghost" : "btn--primary btn--pulse"
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
                    {onbComplete
                      ? t(dict, "onboarding_view")
                      : t(dict, "onboarding_complete")}
                  </Link>

                  <Link
                    href={`${prefix}/assessment`}
                    className={`btn ${assComplete ? "btn--ghost" : "btn--primary btn--pulse"
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
                    {assComplete
                      ? t(dict, "assessment_view")
                      : t(dict, "assessment_take")}
                  </Link>

                  <Link href={`${prefix}/packages`} className="btn btn--ghost">
                    {t(dict, "view_all_plans")}
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* Teacher panel - show for teachers or when impersonating a teacher */}
        {showTeacherContent && (
          <div className="panel panel--featured">
            <div className="panel__badge">{t(dict, "teaching_badge")}</div>
            <h3>{t(dict, "teaching_title")}</h3>
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
                <p>{t(dict, "teaching_none")}</p>
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
                      ? ` — ${fmtInTz(teachSummary.nextTeach.endAt, timezone)}`
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
                  {joinableTeach ? (
                    <Link
                      href={`/classroom/${teachSummary.nextTeach.id}`}
                      className="btn btn--primary btn--glow"
                    >
                      {t(dict, "session_join_classroom")}
                    </Link>
                  ) : (
                    <Link
                      href={`${prefix}/calendar`}
                      className="btn btn--ghost"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {t(dict, "teaching_view_calendar")}
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            UPCOMING SESSIONS
           ========================================================================= */}
        <div className="panel">
          <div className="panel__head">
            <div>
              <h3>{t(dict, "upcoming_title")}</h3>
              {upcoming.length > 0 && (
                <span className="session-count">
                  {upcoming.length}{" "}
                  {upcoming.length === 1 ? "session" : "sessions"}
                </span>
              )}
            </div>

            <Link
              href={`${prefix}/calendar`}
              className="btn btn--ghost btn--sm"
            >
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
              {t(dict, "upcoming_open_calendar")}
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <p>{t(dict, "upcoming_none")}</p>
            </div>
          ) : (
            <>
              <div className="session-list session-list--scrollable" data-lenis-prevent>
                {upcoming.map((s) => (
                  <SessionRow
                    key={s.id}
                    s={s}
                    timezone={timezone}
                    isUpcoming
                    onCancel={handleCancel}
                    onRescheduleClick={openReschedule}
                    isTeacher={isTeacher}
                    isAdmin={isAdmin}
                    isImpersonating={isImpersonating}
                    dict={dict}
                    prefix={prefix}
                  />
                ))}
              </div>

              {upcoming.length >= 10 && (
                <div className="panel__footer">
                  <Link
                    href={`${prefix}/calendar`}
                    className="btn btn--secondary btn--full"
                  >
                    View all sessions in calendar →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* =========================================================================
            PAST SESSIONS
           ========================================================================= */}
        <div className="panel">
          <div className="panel__head">
            <div>
              <h3>{t(dict, "past_title")}</h3>
              {past.length > 0 && (
                <span className="session-count">
                  {past.length} {past.length === 1 ? "session" : "sessions"}
                </span>
              )}
            </div>

            <Link
              href={`${prefix}/calendar`}
              className="btn btn--ghost btn--sm"
            >
              {t(dict, "past_view_all")}
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
              <p>{t(dict, "past_none")}</p>
            </div>
          ) : (
            <>
              <div className="session-list session-list--scrollable" data-lenis-prevent>
                {past.map((s) => (
                  <SessionRow
                    key={s.id}
                    s={s}
                    timezone={timezone}
                    isUpcoming={false}
                    onCancel={() => { }}
                    onRescheduleClick={() => { }}
                    isTeacher={isTeacher}
                    isImpersonating={isImpersonating}
                    dict={dict}
                    prefix={prefix}
                  />
                ))}
              </div>

              {past.length >= 10 && (
                <div className="panel__footer">
                  <Link
                    href={`${prefix}/calendar`}
                    className="btn btn--secondary btn--full"
                  >
                    View all {past.length} past sessions →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {reschedOpen && (
          <Modal
            title={t(dict, "modal_reschedule_title")}
            onClose={() => setReschedOpen(false)}
          >
            <div className="form-grid">
              <label>
                <span>{t(dict, "modal_start_time")}</span>
                <input
                  type="datetime-local"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </label>
              <label>
                <span>{t(dict, "modal_end_time")}</span>
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
                {t(dict, "modal_cancel")}
              </button>
              <button className="btn btn--primary" onClick={submitReschedule}>
                {t(dict, "modal_save_changes")}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}

export default function DashboardPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const dict = getDictionary(locale, "dashboard");
  return <DashboardInner dict={dict} prefix={prefix} />;
}
