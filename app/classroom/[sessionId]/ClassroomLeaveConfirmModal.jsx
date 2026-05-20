"use client";

import { BookOpen, CalendarClock, Clock3, Timer, Users } from "lucide-react";

export default function ClassroomLeaveConfirmModal({
  show,
  setShowLeaveConfirm,
  prefix,
  summary,
}) {
  if (!show) return null;

  return (
    <div className="cr-modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
      <div className="cr-modal cr-modal--small" onClick={(e) => e.stopPropagation()}>
        <div className="cr-modal__header">
          <h2 className="cr-modal__title">Leave classroom?</h2>
        </div>
        <div className="cr-modal__body">
          <p>
            Are you sure you want to leave this live session? Any ongoing
            conversation and screen sharing will stop.
          </p>

          {summary && (
            <section className="cr-leave-summary" aria-label="Session summary">
              <div className="cr-leave-summary__header">
                <div>
                  <span className="cr-leave-summary__eyebrow">Session summary</span>
                  <strong>{summary.statusLabel}</strong>
                </div>
              </div>

              <div className="cr-leave-summary__grid">
                <div className="cr-leave-summary__item">
                  <Timer size={16} />
                  <span>Elapsed</span>
                  <strong>{summary.elapsedLabel}</strong>
                </div>
                <div className="cr-leave-summary__item">
                  <Clock3 size={16} />
                  <span>Scheduled</span>
                  <strong>{summary.scheduledLabel}</strong>
                </div>
                <div className="cr-leave-summary__item">
                  <Users size={16} />
                  <span>Participants</span>
                  <strong>{summary.participantLabel}</strong>
                </div>
                <div className="cr-leave-summary__item">
                  <BookOpen size={16} />
                  <span>Resource</span>
                  <strong>{summary.resourceLabel}</strong>
                </div>
              </div>

              {summary.endLabel && (
                <div className="cr-leave-summary__end">
                  <CalendarClock size={16} />
                  <span>{summary.endLabel}</span>
                </div>
              )}
            </section>
          )}
        </div>
        <div className="cr-modal__footer">
          <button
            type="button"
            className="cr-button cr-button--ghost"
            onClick={() => setShowLeaveConfirm(false)}
          >
            Cancel
          </button>
          <a href={`${prefix}/dashboard`} className="cr-button cr-button--danger">
            Yes, leave
          </a>
        </div>
      </div>
    </div>
  );
}
