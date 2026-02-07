"use client";

import { GraduationCap, UserRound, Users } from "lucide-react";

export default function ClassroomParticipantsModal({
  show,
  setShowParticipantList,
  participantCount,
  capacity,
  teacherName,
  learners,
  buildDisplayName,
}) {
  if (!show) return null;

  return (
    <div className="cr-modal-overlay" onClick={() => setShowParticipantList(false)}>
      <div
        className="cr-modal cr-modal--small"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cr-modal__header">
          <h2 className="cr-modal__title">
            <Users size={18} /> Participants ({participantCount}
            {capacity && `/${capacity}`})
          </h2>
          <button
            className="cr-modal__close"
            onClick={() => setShowParticipantList(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="cr-modal__body" data-lenis-prevent>
          <div className="cr-participant-list">
            <div className="cr-participant cr-participant--teacher">
              <span className="cr-participant__avatar"><UserRound size={20} /></span>
              <span className="cr-participant__name">{teacherName}</span>
              <span className="cr-participant__role">Teacher</span>
            </div>

            <div className="cr-participant-list__divider">
              Learners ({learners.length})
            </div>

            {learners.length === 0 ? (
              <p className="cr-participant-list__empty">
                No learners in this session
              </p>
            ) : (
              learners.map((learner, idx) => (
                <div
                  key={learner.id || idx}
                  className={`cr-participant ${learner.status === "canceled"
                    ? "cr-participant--canceled"
                    : ""
                    }`}
                >
                  <span className="cr-participant__avatar"><GraduationCap size={20} /></span>
                  <span className="cr-participant__name">
                    {buildDisplayName(learner) ||
                      learner.email?.split("@")[0] ||
                      "Learner"}
                  </span>
                  {learner.status && learner.status !== "booked" && (
                    <span
                      className={`cr-participant__status cr-participant__status--${learner.status}`}
                    >
                      {learner.status}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
