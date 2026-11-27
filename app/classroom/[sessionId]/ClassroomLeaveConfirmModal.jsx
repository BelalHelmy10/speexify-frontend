"use client";

import { BookOpen, CalendarClock, Clock3, LogOut, Timer, Users } from "lucide-react";
import useFocusTrap from "@/hooks/useFocusTrap";
import { useClassroomText } from "./classroomText";

export default function ClassroomLeaveConfirmModal({
  show,
  setShowLeaveConfirm,
  prefix,
  sessionId,
  summary,
  isTeacher,
  isTraining = false,
  isAdmin = false,
}) {
  const ct = useClassroomText();
  const modalRef = useFocusTrap(Boolean(show), {
    onEscape: () => setShowLeaveConfirm(false),
  });

  if (!show) return null;

  const hasEnded = Boolean(summary?.hasEnded);

  const leaveHref = isTraining && isAdmin
    ? `${prefix}/admin`
    : isTeacher
    ? `${prefix}/dashboard`
    : `${prefix}/dashboard/sessions/${sessionId}#lesson`;
  return (
    <div className="cr-modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
      <div
        ref={modalRef}
        className="cr-modal cr-modal--small"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cr-leave-confirm-title"
      >
        <div className="cr-modal__header">
          <h2 id="cr-leave-confirm-title" className="cr-modal__title">
            <LogOut size={18} />
            {ct("cr_leave_title")}
          </h2>
        </div>
        <div className="cr-modal__body">
          {summary?.elapsedLabel && (
            <div className="cr-leave-elapsed">
              <Timer size={20} />
              <div className="cr-leave-elapsed__text">
                <span className="cr-leave-elapsed__time">{summary.elapsedLabel}</span>
                <span className="cr-leave-elapsed__label">{ct("cr_leave_in_session")}</span>
              </div>
            </div>
          )}

          <p className="cr-leave-notice">
            {hasEnded
              ? ct("cr_leave_ended")
              : isTraining
                ? ct("cr_leave_training")
              : isTeacher
                ? ct("cr_leave_teacher")
                : ct("cr_leave_learner")}
          </p>

          {summary && (
            <section className="cr-leave-summary" aria-label={ct("cr_leave_summary")}>
              <div className="cr-leave-summary__grid">
                <div className="cr-leave-summary__item">
                  <Clock3 size={14} />
                  <span>{ct("cr_leave_scheduled")}</span>
                  <strong>{summary.scheduledLabel}</strong>
                </div>
                <div className="cr-leave-summary__item">
                  <Users size={14} />
                  <span>{ct("cr_leave_participants")}</span>
                  <strong>{summary.participantLabel}</strong>
                </div>
                <div className="cr-leave-summary__item">
                  <BookOpen size={14} />
                  <span>{ct("cr_leave_resource")}</span>
                  <strong>{summary.resourceLabel}</strong>
                </div>
                {summary.statusLabel && (
                  <div className="cr-leave-summary__item">
                    <CalendarClock size={14} />
                    <span>{ct("cr_leave_status")}</span>
                    <strong>{summary.statusLabel}</strong>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
        <div className="cr-modal__footer">
          <button
            type="button"
            className="cr-button cr-button--ghost"
            onClick={() => setShowLeaveConfirm(false)}
          >
            {ct("cr_leave_stay")}
          </button>
          <a href={leaveHref} className="cr-button cr-button--danger">
            {isTeacher ? ct("cr_leave_session") : ct("cr_leave_open_recap")}
          </a>
        </div>
      </div>
    </div>
  );
}
