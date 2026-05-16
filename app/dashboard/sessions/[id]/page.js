// app/dashboard/sessions/[id]/page.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import "@/styles/session-detail.scss";
import { getDictionary, t } from "@/app/i18n";
import { useToast } from "@/components/ToastProvider";
import useAuth from "@/hooks/useAuth";
import { getSafeExternalUrl } from "@/utils/url";
import { LearnerFeedbackModal } from "./LearnerFeedbackForm";
import SessionDetailLayout from "./SessionDetailLayout";
import {
  buildGoogleCalendarUrl,
  formatDuration,
  formatHeroDate,
  getJoinWindow,
} from "./sessionDetailUtils";

export default function SessionDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();
  const { user, checking } = useAuth();

  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const dict = getDictionary(locale, "session");
  const { toast, confirmModal } = useToast();

  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [hasLearnerFeedback, setHasLearnerFeedback] = useState(false);

  const txt = useCallback(
    (key, fallback) => {
      const result = t(dict, key);
      if (
        !result ||
        result === key ||
        result.startsWith("__") ||
        result.endsWith("__")
      ) {
        return fallback;
      }
      return result;
    },
    [dict]
  );

  const dashboardHref = `${prefix}/dashboard`;
  const progressHref = `${prefix}/dashboard/progress`;
  const classroomHref = `${prefix}/classroom/${id}`;

  const loadSession = useCallback(async () => {
    if (!id) return;
    try {
      setStatus("loading");
      const { data } = await api.get(`/sessions/${id}`);
      setSession(data?.session || null);
      setStatus("ok");
    } catch (err) {
      console.error("Failed to load session", err);
      setError(
        err?.response?.data?.error ||
          txt("generic_error", "Something went wrong")
      );
      setStatus("error");
    }
  }, [id, txt]);

  const checkLearnerFeedback = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get(`/sessions/${id}/learner-feedback`);
      setHasLearnerFeedback(Boolean(data?.feedback));
    } catch {
      setHasLearnerFeedback(false);
    }
  }, [id]);

  useEffect(() => {
    if (!checking && !user) {
      router.replace(
        `${prefix}/login?next=${encodeURIComponent(pathname || `${prefix}/dashboard/sessions/${id}`)}`
      );
    }
  }, [checking, user, router, prefix, pathname, id]);

  useEffect(() => {
    if (!id || checking || !user) return;
    loadSession();
  }, [id, checking, user, loadSession]);

  useEffect(() => {
    if (!session?.isLearner || session.status !== "completed") return;
    checkLearnerFeedback();
  }, [session, checkLearnerFeedback]);

  const formatDateTime = useCallback(
    (value) => {
      if (!value) return txt("datetime_na", "N/A");
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleString(locale === "ar" ? "ar" : undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    },
    [locale, txt]
  );

  const formatOpensTime = useCallback(
    (date) => {
      if (!date) return "";
      return date.toLocaleTimeString(locale === "ar" ? "ar" : undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    [locale]
  );

  const pageShell = (children) => (
    <div className="page-session-detail">
      <div className="page-session-detail__inner container-narrow">
        {children}
      </div>
    </div>
  );

  if (checking || (status === "loading" && !session)) {
    return pageShell(
      <>
        <div className="sd-skeleton" style={{ minHeight: 280, marginBottom: 24 }} />
        <div className="sd-skeleton" style={{ minHeight: 420 }} />
      </>
    );
  }

  if (status === "error" || !session) {
    return pageShell(
      <>
        <div className="page-session-detail__topbar">
          <nav className="sd-breadcrumbs" aria-label="Breadcrumb">
            <Link href={dashboardHref}>{txt("back_dashboard", "Dashboard")}</Link>
            <span className="sd-breadcrumbs__sep" aria-hidden>
              /
            </span>
            <span className="sd-breadcrumbs__current">
              {txt("error_title", "Session")}
            </span>
          </nav>
          <Link href={dashboardHref} className="page-session-detail__back">
            {String(txt("back_btn", "Back")).replace(/^[\s←→‹›-]+/, "")}
          </Link>
        </div>
        <header className="sd-hero sd-hero--canceled">
          <div className="sd-hero__inner">
            <div>
              <h1 className="sd-hero__title">
                {txt("error_title", "Session Not Found")}
              </h1>
              <p className="sd-hero__subtitle">
                {txt("error_subtitle", "We couldn't find this session.")}
              </p>
            </div>
            <div className="sd-hero__status-wrap">
              <span className="sd-status sd-status--canceled">
                <span className="sd-status__dot" aria-hidden />
                {txt("error_badge", "Error")}
              </span>
            </div>
          </div>
        </header>
        <p className="session-detail-error" style={{ marginTop: 24 }}>
          {error || txt("error_fallback", "Could not load session.")}
        </p>
      </>
    );
  }

  const {
    id: sessionId,
    title,
    startAt,
    endAt,
    meetingUrl,
    joinUrl,
    notes,
    user: legacyLearner,
    teacher,
    status: sessionStatus,
    type,
    capacity,
    participantCount,
    participants,
    learners,
    isLearner,
    isTeacher: sessionIsTeacher,
    isAdmin: sessionIsAdmin,
    teacherFeedback,
  } = session;

  const isGroup = String(type || "").toUpperCase() === "GROUP";
  const durationStr = formatDuration(startAt, endAt);
  const joinWindow = getJoinWindow(session);
  const timezone =
    user?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";

  const statusConfig = {
    scheduled: {
      label: txt("status_scheduled", "Scheduled"),
      className: "session-detail-status--scheduled",
    },
    completed: {
      label: txt("status_completed", "Completed"),
      className: "session-detail-status--completed",
    },
    canceled: {
      label: txt("status_canceled", "Canceled"),
      className: "session-detail-status--canceled",
    },
  };
  const currentStatus = statusConfig[sessionStatus] || statusConfig.scheduled;

  const learnersList = (() => {
    if (Array.isArray(learners) && learners.length > 0) return learners;
    if (Array.isArray(participants) && participants.length > 0) {
      return participants.map((p) => ({
        id: p.userId || p.id,
        name: p.user?.name || p.name || null,
        email: p.user?.email || p.email || null,
        status: p.status,
      }));
    }
    return [];
  })();

  const activeParticipants = learnersList.filter((l) => l.status !== "canceled");
  const attendanceParticipants = learnersList.map((l) => ({
    userId: l.id,
    status: l.status || "booked",
    attendedAt: l.attendedAt || null,
    user: { id: l.id, name: l.name, email: l.email },
  }));

  const learnerLabel = isGroup
    ? txt("section_learners_title", "Learners")
    : txt("section_learner_title", "Learner");

  const canCancelOrLeave = !!(sessionIsAdmin || sessionIsTeacher || isLearner);
  const canReschedule = !!(sessionIsAdmin || sessionIsTeacher);
  const showActions = sessionStatus === "scheduled" && canCancelOrLeave;
  const canComplete =
    (sessionIsTeacher || sessionIsAdmin) &&
    sessionStatus === "scheduled" &&
    joinWindow.start &&
    joinWindow.now >= joinWindow.start;

  const isTerminal =
    sessionStatus === "completed" || sessionStatus === "canceled";
  const showSummary = isTerminal;

  const hasExternal = !!(meetingUrl || joinUrl);
  const calendarUrl = buildGoogleCalendarUrl({
    title: title || "Speexify session",
    startAt,
    endAt,
    details: teacher
      ? `Teacher: ${teacher.name || teacher.email}`
      : undefined,
  });

  const cancelLabel =
    isGroup && !sessionIsTeacher && !sessionIsAdmin
      ? txt("session_leave", "Leave Session")
      : txt("session_cancel", "Cancel Session");

  const cancelTitle =
    isGroup && !sessionIsTeacher && !sessionIsAdmin
      ? txt("session_leave_title", "Leave this group session?")
      : txt("session_cancel_title", "Cancel this session?");

  const handleCancelOrLeave = async () => {
    if (!canCancelOrLeave || busy) return;
    const ok = await confirmModal(cancelTitle);
    if (!ok) return;
    try {
      setBusy(true);
      const res = await api.post(`/sessions/${sessionId}/cancel`);
      const scope = res?.data?.scope;
      if (scope === "participant") {
        toast.success(txt("session_left_success", "You left the session."));
      } else if (scope === "session") {
        toast.success(txt("session_canceled_success", "Session canceled."));
      } else {
        toast.success(txt("success_saved", "Done."));
      }
      await loadSession();
    } catch (e) {
      toast.error(
        e?.response?.data?.error || txt("generic_error", "Something went wrong")
      );
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    const ok = await confirmModal(
      txt(
        "session_complete_confirm",
        "Mark this session as completed? Credits will be consumed."
      )
    );
    if (!ok) return;
    try {
      setBusy(true);
      await api.post(`/sessions/${sessionId}/complete`);
      toast.success(
        txt("session_completed_success", "Session marked as completed")
      );
      await loadSession();
    } catch (e) {
      toast.error(
        e?.response?.data?.error || txt("generic_error", "Something went wrong")
      );
    } finally {
      setBusy(false);
    }
  };

  const sessionTitle = title || txt("normal_title_fallback", "Session");

  const renderJoinAside = () => {
    if (sessionStatus === "canceled") {
      return (
        <p className="sd-callout sd-callout--muted">
          {txt("join_session_canceled", "This session was canceled.")}
        </p>
      );
    }

    if (sessionStatus === "completed") {
      return (
        <div className="sd-actions-stack">
            <Link href={classroomHref} className="btn btn--ghost">
              {txt("join_view_classroom", "View classroom")}
            </Link>
            {hasExternal && (
              <a
                href={getSafeExternalUrl(meetingUrl || joinUrl)}
                target="_blank"
                rel="noreferrer"
                className="btn btn--ghost"
              >
                {txt("join_external_link", "External meeting link")}
              </a>
            )}
        </div>
      );
    }

    if (joinWindow.canJoin) {
      return (
        <div className="sd-actions-stack">
          <Link href={classroomHref} className="btn btn--primary">
            {txt("join_classroom_now", "Join classroom now")}
          </Link>
          {hasExternal && (
            <a
              href={getSafeExternalUrl(meetingUrl || joinUrl)}
              target="_blank"
              rel="noreferrer"
              className="btn btn--ghost"
            >
              {txt("join_external_link", "External meeting link")}
            </a>
          )}
        </div>
      );
    }

    return (
      <div className="sd-actions-stack">
        {calendarUrl && (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn--ghost"
          >
            {txt("add_to_calendar", "Add to calendar")}
          </a>
        )}
        <Link href={classroomHref} className="btn btn--ghost">
          {txt("join_open_classroom", "Open Speexify classroom")}
        </Link>
      </div>
    );
  };

  return pageShell(
    <>
      <SessionDetailLayout
        txt={txt}
        locale={locale}
        prefix={prefix}
        dashboardHref={dashboardHref}
        progressHref={progressHref}
        classroomHref={classroomHref}
        sessionTitle={sessionTitle}
        sessionStatus={sessionStatus}
        statusConfig={currentStatus}
        isGroup={isGroup}
        durationStr={durationStr}
        timezone={timezone}
        startAt={startAt}
        endAt={endAt}
        teacher={teacher}
        learnerLabel={learnerLabel}
        legacyLearner={legacyLearner}
        activeParticipants={activeParticipants}
        participantCount={participantCount}
        capacity={capacity}
        attendanceParticipants={attendanceParticipants}
        sessionId={sessionId}
        sessionIsTeacher={sessionIsTeacher}
        sessionIsAdmin={sessionIsAdmin}
        isLearner={isLearner}
        notes={notes}
        teacherFeedback={teacherFeedback}
        showSummary={showSummary}
        showActions={showActions}
        canComplete={canComplete}
        canReschedule={canReschedule}
        busy={busy}
        cancelLabel={cancelLabel}
        cancelTitle={cancelTitle}
        hasExternal={hasExternal}
        meetingUrl={meetingUrl}
        joinUrl={joinUrl}
        calendarUrl={calendarUrl}
        joinWindow={joinWindow}
        renderJoinAside={renderJoinAside}
        onComplete={handleComplete}
        onCancelOrLeave={handleCancelOrLeave}
        onOpenFeedback={() => setShowFeedbackModal(true)}
        hasLearnerFeedback={hasLearnerFeedback}
        formatDateTime={formatDateTime}
        formatHeroDate={formatHeroDate}
        formatOpensTime={formatOpensTime}
        loadSession={loadSession}
      />

      <LearnerFeedbackModal
        isOpen={showFeedbackModal}
        sessionId={Number(sessionId)}
        sessionTitle={sessionTitle}
        teacherName={teacher?.name}
        sessionDate={startAt}
        onSubmit={() => {
          checkLearnerFeedback();
          loadSession();
        }}
        onClose={() => setShowFeedbackModal(false)}
      />
    </>
  );
}
