"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  GraduationCap,
  Hand,
  Lock,
  MicOff,
  MoreHorizontal,
  Pin,
  Unlock,
  UserRound,
  Users,
  UserX,
  X,
} from "lucide-react";
import { formatNumber } from "@/utils/locale";

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
      aria-label={title}
    >
      {children}
    </button>
  );
}

function ParticipantActions({
  liveParticipant,
  handRaised = false,
  videoControlsReady = false,
  onMuteParticipant,
  onPinParticipant,
  onLowerHand,
  onRemoveParticipant,
  learnerName,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const triggerRef = useRef(null);
  const menuContentRef = useRef(null);
  const canControl = Boolean(liveParticipant && videoControlsReady);

  useEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return undefined;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuContentRef.current;
      if (!trigger || !menu) return;

      const triggerRect = trigger.getBoundingClientRect();
      const menuWidth = menu.offsetWidth || 160;
      const menuHeight = menu.offsetHeight || 200;
      const edge = 12;
      const gap = 8;

      let top = triggerRect.bottom + gap;
      if (top + menuHeight > window.innerHeight - edge) {
        top = triggerRect.top - menuHeight - gap;
      }
      top = Math.max(edge, Math.min(top, window.innerHeight - menuHeight - edge));

      let left = triggerRect.right - menuWidth;
      left = Math.max(edge, Math.min(left, window.innerWidth - menuWidth - edge));

      setMenuPosition({ top, left });
    };

    const closeOnOutsidePointer = (event) => {
      if (
        !triggerRef.current?.contains(event.target) &&
        !menuContentRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const frameId = window.requestAnimationFrame(updatePosition);
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const closeMenu = () => {
    setIsOpen(false);
    setMenuPosition(null);
  };
  const runAction = (action) => {
    action?.();
    closeMenu();
  };

  const menu = isOpen && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={menuContentRef}
          className="cr-participant-menu__content"
          role="menu"
          aria-label="Participant actions"
          style={{
            top: menuPosition ? `${menuPosition.top}px` : "0px",
            left: menuPosition ? `${menuPosition.left}px` : "0px",
            visibility: menuPosition ? "visible" : "hidden",
          }}
        >
          <TeacherActionButton
            disabled={!canControl}
            onClick={() => runAction(() => onMuteParticipant?.(liveParticipant?.id))}
            title="Mute this participant"
          >
            <MicOff size={14} /> Mute
          </TeacherActionButton>
          <TeacherActionButton
            disabled={!canControl}
            onClick={() => runAction(() => onPinParticipant?.(liveParticipant?.id))}
            title="Spotlight this participant"
          >
            <Pin size={14} /> Pin
          </TeacherActionButton>
          <TeacherActionButton
            disabled={!handRaised}
            onClick={() => runAction(() => onLowerHand?.(learnerName))}
            title="Lower this participant's hand"
          >
            <Hand size={14} /> Lower hand
          </TeacherActionButton>
          <TeacherActionButton
            kind="danger"
            disabled={!canControl}
            onClick={() => runAction(() => onRemoveParticipant?.(liveParticipant?.id))}
            title="Remove this participant from the call"
          >
            <UserX size={14} /> Remove
          </TeacherActionButton>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="cr-participant-menu">
      <button
        ref={triggerRef}
        type="button"
        className="cr-participant-menu__trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => (isOpen ? closeMenu() : setIsOpen(true))}
      >
        <MoreHorizontal size={18} />
        <span>Actions</span>
      </button>
      {menu}
    </div>
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
  locale = "en",
}) {
  if (!show) return null;

  const safeLearners = Array.isArray(learners) ? learners : [];
  const liveParticipants = Array.from(
    new Map(
      (Array.isArray(videoParticipants) ? videoParticipants : [])
        .filter((participant) => participant?.id)
        .map((participant) => [String(participant.id), participant])
    ).values()
  );
  const raisedHandNames = new Set(
    raisedHands.map((entry) =>
      normalizeName(typeof entry === "string" ? entry : entry.userName)
    )
  );
  const usedLiveParticipantIds = new Set();
  const liveTeacher = findLiveParticipant({
    learnerName: teacherName,
    liveParticipants,
    usedIds: usedLiveParticipantIds,
  });
  if (liveTeacher) usedLiveParticipantIds.add(liveTeacher.id);

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
    (participant) =>
      !usedLiveParticipantIds.has(participant.id) &&
      normalizeName(participant.displayName) !== normalizeName(teacherName)
  );

  const participantCountLabel = `${formatNumber(participantCount, locale)}${
    capacity ? `/${formatNumber(capacity, locale)}` : ""
  }`;
  const liveCountLabel = formatNumber(liveParticipants.length, locale);

  return (
    <div className="cr-modal-overlay cr-participants-overlay" onClick={() => setShowParticipantList(false)}>
      <div
        className="cr-modal cr-modal--participants cr-participants-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cr-participants-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cr-modal__header cr-participants-header">
          <div className="cr-participants-header__heading">
            <span className="cr-participants-header__icon" aria-hidden="true">
              <Users size={21} />
            </span>
            <div>
              <h2 id="cr-participants-title" className="cr-modal__title">
                Participants
              </h2>
              <p className="cr-participants-header__summary">
                {liveCountLabel} in call <span aria-hidden="true">·</span> {participantCountLabel} participants
              </p>
            </div>
          </div>
          <button
            className="cr-modal__close cr-participants-header__close"
            onClick={() => setShowParticipantList(false)}
            aria-label="Close participants"
          >
            <X size={20} />
          </button>
        </header>

        <div className="cr-modal__body cr-participants-body" data-lenis-prevent>
          {isTeacher && (
            <section className="cr-participants-controls" aria-label="Classroom controls">
              <div className="cr-participants-controls__copy">
                <span className="cr-participants-controls__eyebrow">Classroom controls</span>
                <span className="cr-participants-controls__state">
                  <span className={`cr-participants-controls__dot ${isClassroomLocked ? "is-locked" : ""}`} />
                  {isClassroomLocked ? "Late joins are locked" : "Late joins are allowed"}
                </span>
              </div>
              <div className="cr-participants-controls__actions">
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
                  {isClassroomLocked ? "Unlock" : "Lock joins"}
                </TeacherActionButton>
              </div>
              {moderationNotice && (
                <p className="cr-participants-controls__notice" role="status">
                  {moderationNotice}
                </p>
              )}
            </section>
          )}

          <section className="cr-participants-roster" aria-label="Classroom roster">
            <div className="cr-participants-roster__heading">
              <div>
                <span className="cr-participants-roster__eyebrow">Classroom roster</span>
                <h3>{liveCountLabel} in the room</h3>
              </div>
              <span className="cr-participants-roster__capacity">{participantCountLabel}</span>
            </div>

            <div className="cr-participants-roster__list">
              <article className="cr-participant-row cr-participant-row--teacher">
                <span className="cr-participant-row__avatar" aria-hidden="true">
                  <UserRound size={19} />
                </span>
                <div className="cr-participant-row__identity">
                  <div className="cr-participant-row__name-line">
                    <span className="cr-participant-row__name">{teacherName}</span>
                    <span className="cr-participant-row__role">Teacher</span>
                  </div>
                  <span className={`cr-participant-row__status ${liveTeacher ? "is-live" : ""}`}>
                    <span className="cr-participant-row__status-dot" />
                    {liveTeacher ? "In call" : "Not joined"}
                  </span>
                </div>
              </article>

              {safeLearners.length === 0 ? (
                <p className="cr-participants-roster__empty">No learners added to this session yet.</p>
              ) : (
                learnerRows.map(({ key, learner, learnerName, liveParticipant, handRaised }) => (
                  <article
                    key={key}
                    className={`cr-participant-row ${learner.status === "canceled" ? "is-canceled" : ""}`}
                  >
                    <span className="cr-participant-row__avatar" aria-hidden="true">
                      <GraduationCap size={19} />
                    </span>
                    <div className="cr-participant-row__identity">
                      <div className="cr-participant-row__name-line">
                        <span className="cr-participant-row__name">{learnerName}</span>
                        {learner.status && learner.status !== "booked" && (
                          <span className="cr-participant-row__status-tag">{learner.status}</span>
                        )}
                      </div>
                      <span className={`cr-participant-row__status ${liveParticipant ? "is-live" : ""}`}>
                        <span className="cr-participant-row__status-dot" />
                        {liveParticipant ? "In call" : "Not joined"}
                        {handRaised && (
                          <span className="cr-participant-row__hand">
                            <Hand size={13} /> Hand raised
                          </span>
                        )}
                      </span>
                    </div>
                    {isTeacher && (
                      <ParticipantActions
                        liveParticipant={liveParticipant}
                        handRaised={handRaised}
                        videoControlsReady={videoControlsReady}
                        onMuteParticipant={onMuteParticipant}
                        onPinParticipant={onPinParticipant}
                        onLowerHand={onLowerHand}
                        onRemoveParticipant={onRemoveParticipant}
                        learnerName={learnerName}
                      />
                    )}
                  </article>
                ))
              )}

              {isTeacher && unmatchedLiveParticipants.length > 0 && (
                <>
                  <div className="cr-participants-roster__subheading">Other connections</div>
                  {unmatchedLiveParticipants.map((participant) => (
                    <article key={participant.id} className="cr-participant-row">
                      <span className="cr-participant-row__avatar" aria-hidden="true">
                        <UserRound size={19} />
                      </span>
                      <div className="cr-participant-row__identity">
                        <div className="cr-participant-row__name-line">
                          <span className="cr-participant-row__name">
                            {participant.displayName || "Participant"}
                          </span>
                          <span className="cr-participant-row__role">Guest</span>
                        </div>
                        <span className="cr-participant-row__status is-live">
                          <span className="cr-participant-row__status-dot" /> In call
                        </span>
                      </div>
                      <ParticipantActions
                        liveParticipant={participant}
                        videoControlsReady={videoControlsReady}
                        onMuteParticipant={onMuteParticipant}
                        onPinParticipant={onPinParticipant}
                        onRemoveParticipant={onRemoveParticipant}
                      />
                    </article>
                  ))}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
