// app/dashboard/sessions/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import "@/styles/session-detail.scss";
import { getDictionary, t } from "@/app/i18n";
import { useToast } from "@/components/ToastProvider";
import { getSafeExternalUrl } from "@/utils/url";
import AttendancePanel from "./AttendancePanel";

export default function SessionDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();

  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const dict = getDictionary(locale, "session");

  const { toast, confirmModal } = useToast();

  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ok" | "error"
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Helper: get translation with fallback (prevents __key__ display)
  const txt = (key, fallback) => {
    const result = t(dict, key);
    // If translation returns the key format (__key__) or is empty, use fallback
    if (
      !result ||
      result === key ||
      result.startsWith("__") ||
      result.endsWith("__")
    ) {
      return fallback;
    }
    return result;
  };

  const loadSession = async () => {
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
  };

  useEffect(() => {
    if (!id) return;
    loadSession();
  }, [id]);

  const handleBack = () => {
    router.back();
  };

  const formatDateTime = (value) => {
    if (!value) return txt("datetime_na", "N/A");
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString(locale === "ar" ? "ar" : undefined, {
      dateStyle: "full",
      timeStyle: "short",
    });
  };

  // ─────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="page-session-detail">
        <div className="page-session-detail__inner container-narrow">
          <button
            onClick={handleBack}
            className="btn btn--ghost page-session-detail__back"
          >
            {txt("back_btn", "← Back")}
          </button>

          <div className="session-detail-card session-detail-card--state">
            <header className="session-detail-header">
              <div>
                <h1 className="session-detail-title">
                  {txt("loading_title", "Loading...")}
                </h1>
                <p className="session-detail-subtitle">
                  {txt(
                    "loading_subtitle",
                    "Please wait while we load the session details."
                  )}
                </p>
              </div>
              <span className="session-detail-status session-detail-status--loading">
                {txt("loading_badge", "Loading")}
              </span>
            </header>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────
  // ERROR / NOT FOUND STATE
  // ─────────────────────────────────────
  if (status === "error" || !session) {
    return (
      <div className="page-session-detail">
        <div className="page-session-detail__inner container-narrow">
          <button
            onClick={handleBack}
            className="btn btn--ghost page-session-detail__back"
          >
            {txt("back_btn", "← Back")}
          </button>

          <div className="session-detail-card session-detail-card--state">
            <header className="session-detail-header">
              <div>
                <h1 className="session-detail-title">
                  {txt("error_title", "Session Not Found")}
                </h1>
                <p className="session-detail-subtitle">
                  {txt("error_subtitle", "We couldn't find this session.")}
                </p>
              </div>
              <span className="session-detail-status session-detail-status--error">
                {txt("error_badge", "Error")}
              </span>
            </header>

            <p className="session-detail-error">
              {error || txt("error_fallback", "Could not load session.")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────
  // NORMAL STATE
  // ─────────────────────────────────────
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
    learners, // ✅ Use learners array from backend (has full user data)
    isLearner,
    isTeacher: sessionIsTeacher,
    isAdmin: sessionIsAdmin,
    teacherFeedback,
  } = session;

  const isGroup = String(type || "").toUpperCase() === "GROUP";

  // ✅ FIX: Use `learners` array first (has name/email), fallback to participants
  const learnersList = (() => {
    // Prefer learners array (backend provides this with full user data)
    if (Array.isArray(learners) && learners.length > 0) {
      return learners;
    }
    // Fallback to participants if learners not available
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

  const activeParticipants = learnersList.filter(
    (l) => l.status !== "canceled"
  );

  // ✅ Transform learners for AttendancePanel format
  const attendanceParticipants = learnersList.map((l) => ({
    userId: l.id,
    status: l.status || "booked",
    attendedAt: l.attendedAt || null,
    user: {
      id: l.id,
      name: l.name,
      email: l.email,
    },
  }));

  const learnerLabel = isGroup
    ? txt("section_learners_title", "Learners")
    : txt("section_learner_title", "Learner");

  const canCancelOrLeave = !!(sessionIsAdmin || sessionIsTeacher || isLearner);
  const canReschedule = !!(sessionIsAdmin || sessionIsTeacher);

  // Only show actions if session is not already canceled/completed
  const showActions = sessionStatus === "scheduled" && canCancelOrLeave;

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

      const { data } = await api.get(`/sessions/${sessionId}`, {
        params: { t: Date.now() },
      });
      setSession(data?.session || null);
    } catch (e) {
      toast.error(
        e?.response?.data?.error || txt("generic_error", "Something went wrong")
      );
    } finally {
      setBusy(false);
    }
  };

  const hasExternal = !!(meetingUrl || joinUrl);

  // Status display config
  const statusConfig = {
    scheduled: {
      label: "SCHEDULED",
      className: "session-detail-status--scheduled",
    },
    completed: {
      label: "COMPLETED",
      className: "session-detail-status--completed",
    },
    canceled: {
      label: "CANCELED",
      className: "session-detail-status--canceled",
    },
  };
  const currentStatus = statusConfig[sessionStatus] || statusConfig.scheduled;

  return (
    <div className="page-session-detail">
      <div className="page-session-detail__inner container-narrow">
        <button
          onClick={handleBack}
          className="btn btn--ghost page-session-detail__back"
        >
          {txt("back_btn", "← Back")}
        </button>

        <div className="session-detail-card">
          <header className="session-detail-header">
            <div>
              <h1 className="session-detail-title">
                {title || txt("normal_title_fallback", "Session")}
              </h1>
              <p className="session-detail-subtitle">
                {txt(
                  "normal_subtitle",
                  "Overview of this lesson, participants, and feedback."
                )}
              </p>
            </div>

            <span
              className={`session-detail-status ${currentStatus.className}`}
            >
              {currentStatus.label}
            </span>
          </header>

          <div className="session-detail-grid">
            {/* TIME SECTION */}
            <section className="session-detail-section">
              <h3 className="session-detail-section__title">
                {txt("section_time_title", "Time")}
              </h3>
              <p className="session-detail-section__body">
                <strong>{txt("time_start_label", "Start:")}</strong>{" "}
                {formatDateTime(startAt)}
                <br />
                <strong>{txt("time_end_label", "End:")}</strong>{" "}
                {formatDateTime(endAt)}
              </p>
            </section>

            {/* TEACHER SECTION */}
            <section className="session-detail-section">
              <h3 className="session-detail-section__title">
                {txt("section_teacher_title", "Teacher")}
              </h3>
              {teacher ? (
                <p className="session-detail-section__body">
                  {teacher.name || teacher.email}
                  <br />
                  <span className="session-detail-muted">{teacher.email}</span>
                </p>
              ) : (
                <p className="session-detail-section__body">
                  {txt("section_teacher_not_assigned", "No teacher assigned")}
                </p>
              )}
            </section>

            {/* LEARNERS SECTION */}
            <section className="session-detail-section">
              <h3 className="session-detail-section__title">{learnerLabel}</h3>

              {!isGroup ? (
                // ONE_ON_ONE: Show single learner
                legacyLearner ? (
                  <p className="session-detail-section__body">
                    {legacyLearner.name || legacyLearner.email}
                    <br />
                    <span className="session-detail-muted">
                      {legacyLearner.email}
                    </span>
                  </p>
                ) : activeParticipants.length > 0 ? (
                  <p className="session-detail-section__body">
                    {activeParticipants[0].name ||
                      activeParticipants[0].email ||
                      "Learner"}
                    <br />
                    {activeParticipants[0].email && (
                      <span className="session-detail-muted">
                        {activeParticipants[0].email}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="session-detail-section__body">
                    {txt("section_learner_not_found", "No learner assigned")}
                  </p>
                )
              ) : (
                // GROUP: Show multiple learners
                <div className="session-detail-section__body">
                  {/* Participant count */}
                  <div
                    className="session-detail-muted"
                    style={{ marginBottom: 8 }}
                  >
                    {txt("session_participants", "Participants")}:{" "}
                    {typeof participantCount === "number"
                      ? participantCount
                      : activeParticipants.length}
                    {typeof capacity === "number" ? ` / ${capacity}` : ""}
                  </div>

                  {activeParticipants.length > 0 ? (
                    <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                      {activeParticipants.map((learner, idx) => {
                        // ✅ FIX: Display name/email, not ID
                        const displayName =
                          learner.name || learner.email || `Learner ${idx + 1}`;
                        const displayEmail = learner.email || "";

                        return (
                          <li
                            key={learner.id || idx}
                            style={{ marginBottom: 6 }}
                          >
                            <span>{displayName}</span>
                            {displayEmail && displayEmail !== displayName && (
                              <span className="session-detail-muted">
                                {" "}
                                — {displayEmail}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p>
                      {txt("session_no_participants", "No participants yet.")}
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* ✅ ATTENDANCE PANEL - For Teachers/Admins */}
          {(sessionIsTeacher || sessionIsAdmin) &&
            sessionStatus !== "canceled" && (
              <section className="session-detail-section session-detail-section--wide">
                <AttendancePanel
                  sessionId={Number(sessionId)}
                  participants={attendanceParticipants}
                  isTeacher={sessionIsTeacher || sessionIsAdmin}
                  sessionStatus={sessionStatus}
                  sessionStartAt={startAt}
                  onUpdate={loadSession}
                />
              </section>
            )}

          {/* JOIN SECTION */}
          <section className="session-detail-section session-detail-section--wide">
            <div className="session-detail-section__header">
              <h3 className="session-detail-section__title">
                {txt("join_title", "Join link")}
              </h3>
            </div>

            <div className="session-detail-join-actions">
              <Link
                href={`/classroom/${sessionId}`}
                className="btn btn--primary session-detail-join-btn"
              >
                {txt("join_open_classroom", "Open Speexify classroom")}
              </Link>

              {hasExternal && (
                <a
                  href={getSafeExternalUrl(meetingUrl || joinUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--ghost session-detail-join-btn"
                >
                  {txt("join_external_link", "Open external link")}
                </a>
              )}

              {!hasExternal && (
                <p className="session-detail-section__body">
                  {txt(
                    "join_no_meeting",
                    "No external meeting link set; use the Speexify classroom above."
                  )}
                </p>
              )}
            </div>
          </section>

          {/* ACTIONS SECTION - Only show if session is scheduled */}
          {showActions && (
            <section className="session-detail-section session-detail-section--wide">
              <div className="session-detail-section__header">
                <h3 className="session-detail-section__title">
                  {txt("actions_title", "Actions")}
                </h3>
              </div>

              <div className="session-detail-join-actions">
                <button
                  className="btn btn--ghost btn--danger"
                  onClick={handleCancelOrLeave}
                  disabled={busy}
                  title={cancelTitle}
                >
                  {busy ? txt("loading_badge", "Loading...") : cancelLabel}
                </button>

                {canReschedule && (
                  <Link href={`${prefix}/calendar`} className="btn btn--ghost">
                    {txt("session_reschedule", "Reschedule")}
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* NOTES SECTION */}
          <section className="session-detail-section session-detail-section--wide">
            <div className="session-detail-section__header">
              <h3 className="session-detail-section__title">
                {txt("notes_title", "Notes / Homework")}
              </h3>
            </div>
            <p className="session-detail-section__body">
              {notes && notes.trim()
                ? notes
                : txt(
                    "notes_empty",
                    "No notes or homework have been added for this session yet."
                  )}
            </p>
          </section>

          {/* FEEDBACK SECTION */}
          {teacherFeedback && (
            <section className="session-detail-section session-detail-section--wide">
              <div className="session-detail-section__header">
                <h3 className="session-detail-section__title">
                  {txt("feedback_title", "Teacher Feedback")}
                </h3>
                <p className="session-detail-section__hint">
                  {txt(
                    "feedback_hint",
                    "Feedback from your teacher for this session."
                  )}
                </p>
              </div>

              <div className="session-detail-feedback-grid">
                <div className="session-detail-feedback">
                  <h4 className="session-detail-feedback__title">
                    {txt("feedback_msg_title", "Message to Learner")}
                  </h4>
                  <p className="session-detail-feedback__body">
                    {teacherFeedback.messageToLearner?.trim()
                      ? teacherFeedback.messageToLearner
                      : txt("feedback_msg_empty", "No message provided.")}
                  </p>
                </div>

                <div className="session-detail-feedback">
                  <h4 className="session-detail-feedback__title">
                    {txt("feedback_comments_title", "Session Comments")}
                  </h4>
                  <p className="session-detail-feedback__body">
                    {teacherFeedback.commentsOnSession?.trim()
                      ? teacherFeedback.commentsOnSession
                      : txt("feedback_comments_empty", "No comments provided.")}
                  </p>
                </div>

                <div className="session-detail-feedback">
                  <h4 className="session-detail-feedback__title">
                    {txt("feedback_future_title", "Future Steps")}
                  </h4>
                  <p className="session-detail-feedback__body">
                    {teacherFeedback.futureSteps?.trim()
                      ? teacherFeedback.futureSteps
                      : txt(
                          "feedback_future_empty",
                          "No future steps provided."
                        )}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
