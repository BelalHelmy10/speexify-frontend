"use client";

import { BookOpen, CalendarClock, Clock3, LogOut, Timer, Users } from "lucide-react";

export default function ClassroomLeaveConfirmModal({
  show,
  setShowLeaveConfirm,
  prefix,
  summary,
  isTeacher,
}) {
  if (!show) return null;

  const hasEnded = summary?.statusLabel?.includes("Over") || summary?.statusLabel === "Time is up";

  return (
    <div className="cr-modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
      <div className="cr-modal cr-modal--small" onClick={(e) => e.stopPropagation()}>
        <div className="cr-modal__header">
          <h2 className="cr-modal__title">
            <LogOut size={18} />
            Leave classroom?
          </h2>
        </div>
        <div className="cr-modal__body">
          {summary?.elapsedLabel && (
            <div className="cr-leave-elapsed">
              <Timer size={20} />
              <div className="cr-leave-elapsed__text">
                <span className="cr-leave-elapsed__time">{summary.elapsedLabel}</span>
                <span className="cr-leave-elapsed__label">in this session</span>
              </div>
            </div>
          )}

          <p className="cr-leave-notice">
            {hasEnded
              ? "The scheduled session time has ended."
              : isTeacher
                ? "The session will continue without you. Learners will remain connected but won\u2019t receive further guidance until you return."
                : "The session will continue without you. Your teacher and other participants will remain connected."}
          </p>

          {summary && (
            <section className="cr-leave-summary" aria-label="Session summary">
              <div className="cr-leave-summary__grid">
                <div className="cr-leave-summary__item">
                  <Clock3 size={14} />
                  <span>Scheduled</span>
                  <strong>{summary.scheduledLabel}</strong>
                </div>
                <div className="cr-leave-summary__item">
                  <Users size={14} />
                  <span>Participants</span>
                  <strong>{summary.participantLabel}</strong>
                </div>
                <div className="cr-leave-summary__item">
                  <BookOpen size={14} />
                  <span>Resource</span>
                  <strong>{summary.resourceLabel}</strong>
                </div>
                {summary.statusLabel && (
                  <div className="cr-leave-summary__item">
                    <CalendarClock size={14} />
                    <span>Status</span>
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
            Stay in session
          </button>
          <a href={`${prefix}/dashboard`} className="cr-button cr-button--danger">
            Leave session
          </a>
        </div>
      </div>
    </div>
  );
}
