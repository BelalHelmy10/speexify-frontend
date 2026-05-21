// app/dashboard/page.js
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import api, { clearCsrfToken } from "@/lib/api";
import { fmtInTz } from "@/utils/date";
import { useToast } from "@/components/ToastProvider";
import { getDictionary, t } from "@/app/i18n";
import SessionRow from "./components/SessionRow";
import DashboardModal from "./components/DashboardModal";
import DashboardKpiCard from "./components/DashboardKpiCard";
import ImpersonationBanner from "./components/ImpersonationBanner";
import LearnerFeedbackPanel from "./components/LearnerFeedbackPanel";

const canJoin = (startAt, endAt, windowMins = 15) => {
  const now = new Date();
  const start = new Date(startAt);
  const end = endAt
    ? new Date(endAt)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const early = new Date(start.getTime() - windowMins * 60 * 1000);
  return now >= early && now <= end;
};

function DashboardNextActionIcon({ tone }) {
  if (tone === "live") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="8 5 19 12 8 19 8 5" />
      </svg>
    );
  }

  if (tone === "setup") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    );
  }

  if (tone === "feedback") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    );
  }

  if (tone === "progress") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 4 3 5-7" />
      </svg>
    );
  }

  if (tone === "schedule") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l3 7 7 .5-5.4 4.6 1.7 6.9L12 17.3 5.7 21l1.7-6.9L2 9.5 9 9z" />
    </svg>
  );
}

function DashboardNextAction({ action }) {
  if (!action) return null;

  return (
    <section className={`dashboard-next-action dashboard-next-action--${action.tone}`}>
      <div className="dashboard-next-action__icon" aria-hidden="true">
        <DashboardNextActionIcon tone={action.tone} />
      </div>

      <div className="dashboard-next-action__content">
        <div className="dashboard-next-action__topline">
          <span>{action.kicker}</span>
          {action.meta ? <strong>{action.meta}</strong> : null}
        </div>
        <h3>{action.title}</h3>
        <p>{action.body}</p>
      </div>

      <div className="dashboard-next-action__actions">
        <Link href={action.primary.href} className="btn btn--primary">
          {action.primary.label}
        </Link>
        {action.secondary?.map((item) => (
          <Link key={`${item.href}-${item.label}`} href={item.href} className="btn btn--ghost">
            {item.label}
          </Link>
        ))}
      </div>
    </section>
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
  const nextLearnerSession =
    visibleNext ||
    upcoming.find((s) => String(s.status || "").toLowerCase() !== "canceled");
  const nextLearnerJoinable =
    nextLearnerSession &&
    canJoin(nextLearnerSession.startAt, nextLearnerSession.endAt);
  const pastArchiveHref = `${prefix}/dashboard/sessions/past`;
  const pastArchiveCount = Math.max(Number(completedCount || 0), past.length);
  const latestFeedbackSession = past.find((s) => s.teacherFeedback);
  const teacherNeedsFeedbackSession = past.find(
    (s) =>
      String(s.status || "").toLowerCase() === "completed" &&
      !s.teacherFeedback
  );
  const actionSessionTitle = (session) =>
    session?.title || t(dict, "session_title_default");
  const actionSessionTime = (session) =>
    session?.startAt ? fmtInTz(session.startAt, timezone) : "";

  const nextAction = (() => {
    if (showTeacherContent) {
      const teachingSession = teachSummary.nextTeach;

      if (teachingSession && joinableTeach) {
        return {
          tone: "live",
          kicker: t(dict, "next_action_label"),
          meta: t(dict, "next_action_meta_live"),
          title: t(dict, "next_action_teach_join_title"),
          body: t(dict, "next_action_teach_join_body", {
            title: actionSessionTitle(teachingSession),
          }),
          primary: {
            href: `/classroom/${teachingSession.id}`,
            label: t(dict, "next_action_cta_join"),
          },
          secondary: [
            {
              href: `${prefix}/calendar`,
              label: t(dict, "next_action_secondary_calendar"),
            },
          ],
        };
      }

      if (teacherNeedsFeedbackSession) {
        return {
          tone: "feedback",
          kicker: t(dict, "next_action_label"),
          meta: t(dict, "next_action_meta_feedback"),
          title: t(dict, "next_action_teacher_feedback_title"),
          body: t(dict, "next_action_teacher_feedback_body", {
            title: actionSessionTitle(teacherNeedsFeedbackSession),
          }),
          primary: {
            href: `${prefix}/dashboard/sessions/${teacherNeedsFeedbackSession.id}/feedback`,
            label: t(dict, "next_action_cta_give_feedback"),
          },
          secondary: [
            {
              href: `${prefix}/dashboard/sessions/${teacherNeedsFeedbackSession.id}`,
              label: t(dict, "session_view_details"),
            },
          ],
        };
      }

      if (teachingSession) {
        return {
          tone: "schedule",
          kicker: t(dict, "next_action_label"),
          meta: t(dict, "next_action_meta_next"),
          title: t(dict, "next_action_teach_prepare_title"),
          body: t(dict, "next_action_teach_prepare_body", {
            title: actionSessionTitle(teachingSession),
            time: actionSessionTime(teachingSession),
          }),
          primary: {
            href: `${prefix}/resources`,
            label: t(dict, "next_action_cta_prepare"),
          },
          secondary: [
            {
              href: `${prefix}/calendar`,
              label: t(dict, "next_action_secondary_calendar"),
            },
          ],
        };
      }

      return {
        tone: "schedule",
        kicker: t(dict, "next_action_label"),
        meta: t(dict, "next_action_meta_schedule"),
        title: t(dict, "next_action_teacher_empty_title"),
        body: t(dict, "next_action_teacher_empty_body"),
        primary: {
          href: `${prefix}/calendar`,
          label: t(dict, "next_action_cta_calendar"),
        },
        secondary: [
          {
            href: `${prefix}/resources`,
            label: t(dict, "next_action_secondary_resources"),
          },
        ],
      };
    }

    if (showLearnerContent) {
      if (nextLearnerSession && nextLearnerJoinable) {
        return {
          tone: "live",
          kicker: t(dict, "next_action_label"),
          meta: t(dict, "next_action_meta_live"),
          title: t(dict, "next_action_join_title"),
          body: t(dict, "next_action_join_body", {
            title: actionSessionTitle(nextLearnerSession),
          }),
          primary: {
            href: `/classroom/${nextLearnerSession.id}`,
            label: t(dict, "next_action_cta_join"),
          },
          secondary: [
            {
              href: `${prefix}/dashboard/sessions/${nextLearnerSession.id}`,
              label: t(dict, "session_view_details"),
            },
          ],
        };
      }

      if (!onbComplete) {
        return {
          tone: "setup",
          kicker: t(dict, "next_action_label"),
          meta: t(dict, "next_action_meta_setup"),
          title: t(dict, "next_action_onboarding_title"),
          body: t(dict, "next_action_onboarding_body"),
          primary: {
            href: `${prefix}/onboarding`,
            label: t(dict, "next_action_cta_onboarding"),
          },
          secondary: [
            {
              href: `${prefix}/dashboard/progress`,
              label: t(dict, "next_action_secondary_progress"),
            },
          ],
        };
      }

      if (!assComplete) {
        return {
          tone: "setup",
          kicker: t(dict, "next_action_label"),
          meta: t(dict, "next_action_meta_setup"),
          title: t(dict, "next_action_assessment_title"),
          body: t(dict, "next_action_assessment_body"),
          primary: {
            href: `${prefix}/assessment`,
            label: t(dict, "next_action_cta_assessment"),
          },
          secondary: [
            {
              href: `${prefix}/dashboard/progress`,
              label: t(dict, "next_action_secondary_progress"),
            },
          ],
        };
      }

      if (nextLearnerSession) {
        return {
          tone: "schedule",
          kicker: t(dict, "next_action_label"),
          meta: t(dict, "next_action_meta_next"),
          title: t(dict, "next_action_prepare_title"),
          body: t(dict, "next_action_prepare_body", {
            title: actionSessionTitle(nextLearnerSession),
            time: actionSessionTime(nextLearnerSession),
          }),
          primary: {
            href: `${prefix}/resources`,
            label: t(dict, "next_action_cta_prepare"),
          },
          secondary: [
            {
              href: `${prefix}/dashboard/sessions/${nextLearnerSession.id}`,
              label: t(dict, "session_view_details"),
            },
          ],
        };
      }

      if (latestFeedbackSession) {
        return {
          tone: "feedback",
          kicker: t(dict, "next_action_label"),
          meta: t(dict, "next_action_meta_feedback"),
          title: t(dict, "next_action_feedback_title"),
          body: t(dict, "next_action_feedback_body", {
            title: actionSessionTitle(latestFeedbackSession),
          }),
          primary: {
            href: `${prefix}/dashboard/sessions/${latestFeedbackSession.id}`,
            label: t(dict, "next_action_cta_feedback"),
          },
          secondary: [
            {
              href: `${prefix}/dashboard/progress`,
              label: t(dict, "next_action_secondary_progress"),
            },
          ],
        };
      }

      if (outOfCredits) {
        return {
          tone: "progress",
          kicker: t(dict, "next_action_label"),
          meta: t(dict, "next_action_meta_progress"),
          title: t(dict, "next_action_package_title"),
          body: t(dict, "next_action_package_body"),
          primary: {
            href: `${prefix}/packages`,
            label: t(dict, "warning_browse_packages"),
          },
          secondary: [
            {
              href: `${prefix}/dashboard/progress`,
              label: t(dict, "next_action_secondary_progress"),
            },
          ],
        };
      }

      return {
        tone: "progress",
        kicker: t(dict, "next_action_label"),
        meta: t(dict, "next_action_meta_progress"),
        title: t(dict, "next_action_progress_title"),
        body: t(dict, "next_action_progress_body"),
        primary: {
          href: `${prefix}/dashboard/progress`,
          label: t(dict, "next_action_cta_progress"),
        },
        secondary: [
          {
            href: `${prefix}/calendar`,
            label: t(dict, "next_action_secondary_calendar"),
          },
          {
            href: `${prefix}/resources`,
            label: t(dict, "next_action_secondary_resources"),
          },
        ],
      };
    }

    return {
      tone: "schedule",
      kicker: t(dict, "next_action_label"),
      meta: t(dict, "next_action_meta_admin"),
      title: t(dict, "next_action_admin_title"),
      body: t(dict, "next_action_admin_body"),
      primary: {
        href: "/admin",
        label: t(dict, "next_action_cta_admin"),
      },
      secondary: [
        {
          href: `${prefix}/calendar`,
          label: t(dict, "next_action_secondary_calendar"),
        },
      ],
    };
  })();

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          IMPERSONATION BANNER - Shows when admin is viewing as another user
          ═══════════════════════════════════════════════════════════════════ */}
      {isImpersonating && (
        <ImpersonationBanner user={user} onStop={handleStopImpersonate} />
      )}

      <div className="dashboard">
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
                🔍 Admin preview mode - viewing {user?.role}&rsquo;s dashboard
              </p>
            )}
          </div>
          <div className="dashboard__header-meta">
            <time
              className="dashboard__date"
              dateTime={new Date().toISOString().slice(0, 10)}
            >
              <span className="dashboard__date-weekday">
                {new Date().toLocaleDateString(undefined, { weekday: "long" })}
              </span>
              <span className="dashboard__date-main">
                {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" })}
              </span>
            </time>
            {isTeacher && (
              <span className="dashboard__role-badge dashboard__role-badge--teacher">
                <svg className="dashboard__role-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
                Teacher
              </span>
            )}
            {isLearner && (
              <span className="dashboard__role-badge dashboard__role-badge--learner">
                <svg className="dashboard__role-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Learner
              </span>
            )}
            {isAdmin && (
              <span className="dashboard__role-badge dashboard__role-badge--admin">
                <svg className="dashboard__role-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Admin
              </span>
            )}
          </div>
        </div>

        <nav className="dashboard__quicknav" aria-label="Dashboard navigation">
          <Link href={`${prefix}/dashboard`} className="is-active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            Overview
          </Link>
          <Link href={`${prefix}/calendar`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Calendar
          </Link>
          {showLearnerContent && (
            <Link href={`${prefix}/dashboard/progress`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 3v18h18" /><path d="M7 15l4-4 4 3 5-7" />
              </svg>
              My Progress
            </Link>
          )}
          <Link href={`${prefix}/resources`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Resources
          </Link>
          <Link href={`${prefix}/dashboard/notifications`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Notifications
          </Link>
        </nav>

        <DashboardNextAction action={nextAction} />

        <div className="dashboard__kpis">
          <DashboardKpiCard
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
          <DashboardKpiCard
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
          <DashboardKpiCard
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

        {/* Two-column body: aside (plan/teacher/feedback) + main (sessions) */}
        <div className="dashboard__body">
          <aside className="dashboard__aside">

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
              The learner would normally see an &ldquo;out of credits&rdquo;
              warning here.
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

        {/* Feedback panel - show for learners or when impersonating a learner */}
        {showLearnerContent && (
          <LearnerFeedbackPanel dict={dict} prefix={prefix} timezone={timezone} />
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

          </aside>
          <div className="dashboard__main">

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
              href={pastArchiveHref}
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
                    href={pastArchiveHref}
                    className="btn btn--secondary btn--full dashboard-past__view-all"
                  >
                    <span>
                      {t(dict, "past_archive_view_all_count", {
                        count: pastArchiveCount,
                      })}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

          </div>{/* dashboard__main */}
        </div>{/* dashboard__body */}

        {reschedOpen && (
          <DashboardModal
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
          </DashboardModal>
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
