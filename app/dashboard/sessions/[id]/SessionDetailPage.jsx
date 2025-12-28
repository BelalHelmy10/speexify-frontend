// app/dashboard/sessions/[id]/SessionDetailPage.jsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/components/ToastProvider";
import { trackEvent } from "@/lib/analytics";
import AttendancePanel from "./AttendancePanel";
import { LearnerFeedbackModal } from "./LearnerFeedbackForm";

/**
 * SessionDetailPage - Full session details with participant management
 */
export default function SessionDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";

  const { user, checking } = useAuth();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // User role helpers
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";
  const isLearner = user?.role === "learner";

  // Load session
  const loadSession = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");
      const { data } = await api.get(`/sessions/${id}`);
      setSession(data?.session || null);
    } catch (err) {
      console.error("Failed to load session:", err);
      setError(err?.response?.data?.error || "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!checking) {
      loadSession();
    }
  }, [checking, loadSession]);

  // Computed values
  const {
    isGroup,
    canJoin,
    canCancel,
    canReschedule,
    canComplete,
    dateStr,
    timeStr,
    endTimeStr,
    durationStr,
  } = useMemo(() => {
    if (!session) {
      return {
        isGroup: false,
        canJoin: false,
        canCancel: false,
        canReschedule: false,
        canComplete: false,
        dateStr: "",
        timeStr: "",
        endTimeStr: "",
        durationStr: "",
      };
    }

    const isGroup = session.type === "GROUP";
    const now = new Date();
    const start = session.startAt ? new Date(session.startAt) : null;
    const end = session.endAt ? new Date(session.endAt) : null;

    // Can join: 15 min before until end
    const joinWindowStart = start
      ? new Date(start.getTime() - 15 * 60 * 1000)
      : null;
    const joinWindowEnd =
      end || (start ? new Date(start.getTime() + 2 * 60 * 60 * 1000) : null);
    const canJoin =
      session.status === "scheduled" &&
      joinWindowStart &&
      now >= joinWindowStart &&
      now <= joinWindowEnd;

    // Can cancel: upcoming and not completed/canceled
    const canCancel = session.status === "scheduled" && start && start > now;

    // Can reschedule: scheduled and in future
    const canReschedule =
      session.status === "scheduled" && start && start > now;

    // Can complete: teacher/admin, started, not completed
    const canComplete =
      (isTeacher || isAdmin) &&
      session.status === "scheduled" &&
      start &&
      now >= start;

    // Format dates
    const dateStr = start
      ? start.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

    const timeStr = start
      ? start.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    const endTimeStr = end
      ? end.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    // Duration
    let durationStr = "";
    if (start && end) {
      const diffMs = end.getTime() - start.getTime();
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins >= 60) {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        durationStr = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      } else {
        durationStr = `${diffMins}m`;
      }
    }

    return {
      isGroup,
      canJoin,
      canCancel,
      canReschedule,
      canComplete,
      dateStr,
      timeStr,
      endTimeStr,
      durationStr,
    };
  }, [session, isTeacher, isAdmin, locale]);

  // Actions
  const handleJoinClassroom = () => {
    trackEvent("session_join", { sessionId: id, type: session?.type });
    router.push(`${prefix}/classroom/${id}`);
  };

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      await api.post(`/sessions/${id}/cancel`);
      trackEvent("session_canceled", { sessionId: id, type: session?.type });
      toast?.success?.("Session canceled successfully");
      setShowCancelModal(false);
      loadSession();
    } catch (err) {
      console.error("Failed to cancel:", err);
      toast?.error?.(err?.response?.data?.error || "Failed to cancel session");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm("Mark this session as completed? Credits will be consumed.")) {
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/sessions/${id}/complete`);
      trackEvent("session_completed", { sessionId: id, type: session?.type });
      toast?.success?.("Session marked as completed");
      loadSession();
    } catch (err) {
      console.error("Failed to complete:", err);
      toast?.error?.(
        err?.response?.data?.error || "Failed to complete session"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
  if (checking || loading) {
    return (
      <div className="session-detail">
        <div className="session-detail__loading">
          <div className="session-detail__spinner" />
          <p>Loading session details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <div className="session-detail">
        <div className="session-detail__error">
          <span className="session-detail__error-icon">⚠️</span>
          <h2>Session not found</h2>
          <p>{error || "Unable to load session details."}</p>
          <Link
            href={`${prefix}/dashboard`}
            className="session-detail__back-btn"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Status badge config
  const statusConfig = {
    scheduled: {
      label: "Scheduled",
      className: "session-detail__status--scheduled",
    },
    completed: {
      label: "Completed",
      className: "session-detail__status--completed",
    },
    canceled: {
      label: "Canceled",
      className: "session-detail__status--canceled",
    },
  };

  const status = statusConfig[session.status] || statusConfig.scheduled;

  return (
    <div className="session-detail">
      {/* Header */}
      <header className="session-detail__header">
        <div className="session-detail__header-top">
          <Link
            href={`${prefix}/dashboard`}
            className="session-detail__back-link"
          >
            ← Back
          </Link>
          <span className={`session-detail__status ${status.className}`}>
            {status.label}
          </span>
        </div>

        <h1 className="session-detail__title">
          {session.title || "Session"}
          {isGroup && <span className="session-detail__type-badge">GROUP</span>}
        </h1>

        <div className="session-detail__header-actions">
          {canJoin && (
            <button
              type="button"
              className="session-detail__join-btn"
              onClick={handleJoinClassroom}
            >
              🎥 Join Classroom Now
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="session-detail__content">
        {/* Date & Time Card */}
        <section className="session-detail__card">
          <h2 className="session-detail__card-title">📅 Date & Time</h2>
          <div className="session-detail__datetime">
            <div className="session-detail__date">{dateStr}</div>
            <div className="session-detail__time">
              {timeStr}
              {endTimeStr && ` – ${endTimeStr}`}
              {durationStr && (
                <span className="session-detail__duration">
                  ({durationStr})
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Participants Card */}
        <section className="session-detail__card">
          <h2 className="session-detail__card-title">
            👥 Participants
            {isGroup && session.capacity && (
              <span className="session-detail__capacity">
                ({session.participantCount || 0}/{session.capacity})
              </span>
            )}
          </h2>

          {/* Teacher */}
          {session.teacher && (
            <div className="session-detail__participant session-detail__participant--teacher">
              <div className="session-detail__participant-avatar">👨‍🏫</div>
              <div className="session-detail__participant-info">
                <div className="session-detail__participant-name">
                  {session.teacher.name || session.teacher.email}
                </div>
                <div className="session-detail__participant-role">Teacher</div>
              </div>
            </div>
          )}

          {/* Learners */}
          <div className="session-detail__learners">
            <h3 className="session-detail__learners-title">
              {isGroup ? "Enrolled Learners" : "Learner"}
            </h3>

            {(!session.learners || session.learners.length === 0) && (
              <p className="session-detail__no-learners">
                No learners enrolled
              </p>
            )}

            {session.learners?.map((learner) => (
              <div
                key={learner.id}
                className={`session-detail__participant ${
                  learner.status === "canceled"
                    ? "session-detail__participant--canceled"
                    : ""
                } ${
                  learner.status === "attended"
                    ? "session-detail__participant--attended"
                    : ""
                }`}
              >
                <div className="session-detail__participant-avatar">👨‍🎓</div>
                <div className="session-detail__participant-info">
                  <div className="session-detail__participant-name">
                    {learner.name || learner.email}
                  </div>
                  <div className="session-detail__participant-status">
                    {learner.status === "attended" && "✓ Attended"}
                    {learner.status === "canceled" && "✗ Canceled"}
                    {learner.status === "booked" && "Enrolled"}
                    {learner.status === "no_show" && "⚠ No Show"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Attendance Panel for Teachers */}
          {(isTeacher || isAdmin) && session.status !== "canceled" && (
            <AttendancePanel
              sessionId={Number(id)}
              participants={
                session.participants?.length > 0
                  ? session.participants
                  : (session.learners || []).map((l) => ({
                      userId: l.id,
                      status: l.status || "booked",
                      attendedAt: l.attendedAt,
                      user: { id: l.id, name: l.name, email: l.email },
                    }))
              }
              isTeacher={isTeacher || isAdmin}
              sessionStatus={session.status}
              sessionStartAt={session.startAt}
              onUpdate={loadSession}
            />
          )}
        </section>

        {/* Feedback Card */}
        {session.teacherFeedback && (
          <section className="session-detail__card">
            <h2 className="session-detail__card-title">📝 Teacher Feedback</h2>

            {session.teacherFeedback.messageToLearner && (
              <div className="session-detail__feedback-section">
                <h3>Message to Learner</h3>
                <p>{session.teacherFeedback.messageToLearner}</p>
              </div>
            )}

            {session.teacherFeedback.commentsOnSession && (
              <div className="session-detail__feedback-section">
                <h3>Session Comments</h3>
                <p>{session.teacherFeedback.commentsOnSession}</p>
              </div>
            )}

            {session.teacherFeedback.futureSteps && (
              <div className="session-detail__feedback-section">
                <h3>Future Steps</h3>
                <p>{session.teacherFeedback.futureSteps}</p>
              </div>
            )}

            {isTeacher && (
              <Link
                href={`${prefix}/dashboard/sessions/${id}/feedback`}
                className="session-detail__edit-feedback-btn"
              >
                Edit Feedback
              </Link>
            )}
          </section>
        )}

        {/* Teacher: Add feedback button if none exists */}
        {isTeacher &&
          !session.teacherFeedback &&
          session.status !== "canceled" && (
            <section className="session-detail__card">
              <h2 className="session-detail__card-title">📝 Feedback</h2>
              <p>No feedback has been added for this session yet.</p>
              <Link
                href={`${prefix}/dashboard/sessions/${id}/feedback`}
                className="session-detail__add-feedback-btn"
              >
                Add Feedback
              </Link>
            </section>
          )}

        {/* Learner: Rate this session */}
        {isLearner && session.status === "completed" && (
          <section className="session-detail__card">
            <h2 className="session-detail__card-title">⭐ Rate Your Session</h2>
            <p>How was your learning experience?</p>
            <button
              type="button"
              className="session-detail__add-feedback-btn"
              onClick={() => setShowFeedbackModal(true)}
            >
              Rate This Session
            </button>
          </section>
        )}

        {/* Actions Card */}
        <section className="session-detail__card session-detail__card--actions">
          <h2 className="session-detail__card-title">⚡ Actions</h2>

          <div className="session-detail__actions">
            {canJoin && (
              <button
                type="button"
                className="session-detail__action-btn session-detail__action-btn--primary"
                onClick={handleJoinClassroom}
              >
                🎥 Join Classroom
              </button>
            )}

            {canComplete && (
              <button
                type="button"
                className="session-detail__action-btn session-detail__action-btn--success"
                onClick={handleComplete}
                disabled={actionLoading}
              >
                ✓ Mark as Completed
              </button>
            )}

            {canReschedule && (
              <button
                type="button"
                className="session-detail__action-btn session-detail__action-btn--secondary"
                onClick={() => setShowRescheduleModal(true)}
                disabled={actionLoading}
              >
                📅 Reschedule
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                className="session-detail__action-btn session-detail__action-btn--danger"
                onClick={() => setShowCancelModal(true)}
                disabled={actionLoading}
              >
                ✗ Cancel Session
              </button>
            )}
          </div>

          {/* Refund policy note */}
          {canCancel && (
            <p className="session-detail__refund-note">
              ℹ️ Cancellations made at least 12 hours before the session start
              time will receive a credit refund.
            </p>
          )}
        </section>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div
          className="session-detail__modal-overlay"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="session-detail__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="session-detail__modal-title">Cancel Session?</h2>
            <p className="session-detail__modal-text">
              {isGroup
                ? isLearner
                  ? "Are you sure you want to cancel your seat in this group session?"
                  : "This will cancel the entire group session for all participants."
                : "Are you sure you want to cancel this session?"}
            </p>
            <p className="session-detail__modal-note">
              {new Date(session.startAt).getTime() - Date.now() >=
              12 * 60 * 60 * 1000
                ? "✓ You will receive a credit refund."
                : "⚠ No refund (less than 12 hours notice)."}
            </p>
            <div className="session-detail__modal-actions">
              <button
                type="button"
                className="session-detail__modal-btn session-detail__modal-btn--cancel"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Session
              </button>
              <button
                type="button"
                className="session-detail__modal-btn session-detail__modal-btn--confirm"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                {actionLoading ? "Canceling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Learner Feedback Modal */}
      <LearnerFeedbackModal
        isOpen={showFeedbackModal}
        sessionId={Number(id)}
        sessionTitle={session?.title}
        teacherName={session?.teacher?.name}
        sessionDate={session?.startAt}
        onSubmit={() => {
          loadSession();
        }}
        onClose={() => setShowFeedbackModal(false)}
      />
    </div>
  );
}
