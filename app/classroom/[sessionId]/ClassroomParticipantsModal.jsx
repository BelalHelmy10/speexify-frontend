"use client";

import {
  GraduationCap,
  Hand,
  Lock,
  MicOff,
  Pin,
  Unlock,
  UserRound,
  Users,
  UserX,
} from "lucide-react";

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getLearnerDisplayName(learner, buildDisplayName) {
  return (
    buildDisplayName(learner) ||
    learner?.email?.split("@")[0] ||
    "Learner"
  );
}

function findLiveParticipant({ learnerName, liveParticipants, usedIds }) {
  const normalizedName = normalizeName(learnerName);
  if (!normalizedName) return null;

  const exact = liveParticipants.find(
    (participant) =>
      !usedIds.has(participant.id) &&
      normalizeName(participant.displayName) === normalizedName
  );
  if (exact) return exact;

  return (
    liveParticipants.find((participant) => {
      if (usedIds.has(participant.id)) return false;
      const displayName = normalizeName(participant.displayName);
      return (
        displayName.includes(normalizedName) ||
        normalizedName.includes(displayName)
      );
    }) || null
  );
}

function TeacherActionButton({
  children,
  disabled = false,
  kind = "secondary",
  onClick,
  title,
}) {
  return (
    <button
      type="button"
      className={`cr-participant-action cr-participant-action--${kind}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

export default function ClassroomParticipantsModal({
  show,
  setShowParticipantList,
  participantCount,
  capacity,
  teacherName,
  learners,
  buildDisplayName,
  isTeacher = false,
  raisedHands = [],
  videoParticipants = [],
  videoControlsReady = false,
  isClassroomLocked = false,
  moderationNotice = "",
  onMuteAll,
  onMuteParticipant,
  onPinParticipant,
  onRemoveParticipant,
  onLowerHand,
  onToggleClassroomLock,
}) {
  if (!show) return null;

  const safeLearners = Array.isArray(learners) ? learners : [];
  const liveParticipants = Array.isArray(videoParticipants)
    ? videoParticipants.filter((participant) => participant?.id)
    : [];
  const raisedHandNames = new Set(
    raisedHands.map((entry) =>
      normalizeName(typeof entry === "string" ? entry : entry.userName)
    )
  );
  const usedLiveParticipantIds = new Set();

  const learnerRows = safeLearners.map((learner, idx) => {
    const learnerName = getLearnerDisplayName(learner, buildDisplayName);
    const liveParticipant = findLiveParticipant({
      learnerName,
      liveParticipants,
      usedIds: usedLiveParticipantIds,
    });
    if (liveParticipant) usedLiveParticipantIds.add(liveParticipant.id);

    return {
      key: learner.id || learner.userId || idx,
      learner,
      learnerName,
      liveParticipant,
      handRaised: raisedHandNames.has(normalizeName(learnerName)),
    };
  });

  const unmatchedLiveParticipants = liveParticipants.filter(
    (participant) => !usedLiveParticipantIds.has(participant.id)
  );

  return (
    <div className="cr-modal-overlay" onClick={() => setShowParticipantList(false)}>
      <div
        className="cr-modal cr-modal--participants"
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
            x
          </button>
        </div>
        <div className="cr-modal__body" data-lenis-prevent>
          {isTeacher && (
            <section className="cr-moderation-panel" aria-label="Teacher controls">
              <div className="cr-moderation-panel__status">
                <span
                  className={`cr-moderation-panel__lock ${isClassroomLocked
                    ? "cr-moderation-panel__lock--active"
                    : ""
                    }`}
                >
                  {isClassroomLocked ? <Lock size={16} /> : <Unlock size={16} />}
                  {isClassroomLocked ? "Locked" : "Unlocked"}
                </span>
                <span>{liveParticipants.length} live</span>
              </div>

              <div className="cr-moderation-panel__actions">
                <TeacherActionButton
                  disabled={!videoControlsReady}
                  onClick={onMuteAll}
                  title="Mute all learners"
                >
                  <MicOff size={15} /> Mute all
                </TeacherActionButton>
                <TeacherActionButton
                  kind={isClassroomLocked ? "secondary" : "danger"}
                  onClick={() => onToggleClassroomLock?.(!isClassroomLocked)}
                  title={
                    isClassroomLocked
                      ? "Allow learners to join again"
                      : "Block late joins"
                  }
                >
                  {isClassroomLocked ? <Unlock size={15} /> : <Lock size={15} />}
                  {isClassroomLocked ? "Unlock classroom" : "Lock classroom"}
                </TeacherActionButton>
              </div>

              {moderationNotice && (
                <p className="cr-moderation-panel__notice" role="status">
                  {moderationNotice}
                </p>
              )}
            </section>
          )}

          <div className="cr-participant-list">
            <div className="cr-participant cr-participant--teacher">
              <span className="cr-participant__avatar"><UserRound size={20} /></span>
              <span className="cr-participant__name">{teacherName}</span>
              <span className="cr-participant__role">Teacher</span>
            </div>

            <div className="cr-participant-list__divider">
              Learners ({safeLearners.length})
            </div>

            {safeLearners.length === 0 ? (
              <p className="cr-participant-list__empty">
                No learners in this session
              </p>
            ) : (
              learnerRows.map(({ key, learner, learnerName, liveParticipant, handRaised }) => (
                <div
                  key={key}
                  className={`cr-participant ${learner.status === "canceled"
                    ? "cr-participant--canceled"
                    : ""
                    }`}
                >
                  <span className="cr-participant__avatar"><GraduationCap size={20} /></span>
                  <span className="cr-participant__name">{learnerName}</span>

                  <span className="cr-participant__meta">
                    {liveParticipant ? "Live" : "Not in call"}
                    {handRaised && (
                      <span className="cr-participant__hand">
                        <Hand size={13} /> Hand raised
                      </span>
                    )}
                  </span>

                  {learner.status && learner.status !== "booked" && (
                    <span
                      className={`cr-participant__status cr-participant__status--${learner.status}`}
                    >
                      {learner.status}
                    </span>
                  )}

                  {isTeacher && (
                    <div className="cr-participant__actions">
                      <TeacherActionButton
                        disabled={!liveParticipant || !videoControlsReady}
                        onClick={() => onMuteParticipant?.(liveParticipant.id)}
                        title="Mute this learner"
                      >
                        <MicOff size={14} /> Mute
                      </TeacherActionButton>
                      <TeacherActionButton
                        disabled={!liveParticipant || !videoControlsReady}
                        onClick={() => onPinParticipant?.(liveParticipant.id)}
                        title="Spotlight this learner"
                      >
                        <Pin size={14} /> Pin
                      </TeacherActionButton>
                      <TeacherActionButton
                        disabled={!handRaised}
                        onClick={() => onLowerHand?.(learnerName)}
                        title="Lower this learner's hand"
                      >
                        <Hand size={14} /> Lower
                      </TeacherActionButton>
                      <TeacherActionButton
                        kind="danger"
                        disabled={!liveParticipant || !videoControlsReady}
                        onClick={() => onRemoveParticipant?.(liveParticipant.id)}
                        title="Remove this learner from the call"
                      >
                        <UserX size={14} /> Remove
                      </TeacherActionButton>
                    </div>
                  )}
                </div>
              ))
            )}

            {isTeacher && unmatchedLiveParticipants.length > 0 && (
              <>
                <div className="cr-participant-list__divider">
                  Live call ({unmatchedLiveParticipants.length})
                </div>
                {unmatchedLiveParticipants.map((participant) => (
                  <div key={participant.id} className="cr-participant">
                    <span className="cr-participant__avatar"><GraduationCap size={20} /></span>
                    <span className="cr-participant__name">
                      {participant.displayName || "Participant"}
                    </span>
                    <span className="cr-participant__meta">Live</span>
                    <div className="cr-participant__actions">
                      <TeacherActionButton
                        disabled={!videoControlsReady}
                        onClick={() => onMuteParticipant?.(participant.id)}
                        title="Mute this participant"
                      >
                        <MicOff size={14} /> Mute
                      </TeacherActionButton>
                      <TeacherActionButton
                        disabled={!videoControlsReady}
                        onClick={() => onPinParticipant?.(participant.id)}
                        title="Spotlight this participant"
                      >
                        <Pin size={14} /> Pin
                      </TeacherActionButton>
                      <TeacherActionButton
                        kind="danger"
                        disabled={!videoControlsReady}
                        onClick={() => onRemoveParticipant?.(participant.id)}
                        title="Remove this participant from the call"
                      >
                        <UserX size={14} /> Remove
                      </TeacherActionButton>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
