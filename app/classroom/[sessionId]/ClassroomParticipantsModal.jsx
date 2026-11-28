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
  VideoOff,
  X,
} from "lucide-react";
import { formatNumber } from "@/utils/locale";
import { buildClassroomRoster, normalizeRosterName as normalizeName } from "@/lib/classroomRoster.mjs";
import { useClassroomText } from "./classroomText";

function getLearnerDisplayName(learner, buildDisplayName) {
  return (
    buildDisplayName(learner) ||
    learner?.email?.split("@")[0] ||
    "Learner"
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
  onStopParticipantVideo,
  onPinParticipant,
  onLowerHand,
  onRemoveParticipant,
  learnerName,
  learnerUserId = null,
}) {
  const ct = useClassroomText();
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
          aria-label={ct("cr_pa_actions_aria")}
          style={{
            top: menuPosition ? `${menuPosition.top}px` : "0px",
            left: menuPosition ? `${menuPosition.left}px` : "0px",
            visibility: menuPosition ? "visible" : "hidden",
          }}
        >
          <TeacherActionButton
            disabled={!canControl}
            onClick={() => runAction(() => onMuteParticipant?.(liveParticipant?.id, learnerUserId))}
            title={ct("cr_pa_mute_hint")}
          >
            <MicOff size={14} /> {ct("cr_pa_mute")}
          </TeacherActionButton>
          <TeacherActionButton
            disabled={!canControl}
            onClick={() => runAction(() => onStopParticipantVideo?.(liveParticipant?.id, learnerUserId))}
            title={ct("cr_pa_stop_video_hint")}
          >
            <VideoOff size={14} /> {ct("cr_pa_stop_video")}
          </TeacherActionButton>
          <TeacherActionButton
            disabled={!canControl}
            onClick={() => runAction(() => onPinParticipant?.(liveParticipant?.id))}
            title={ct("cr_pa_pin_hint")}
          >
            <Pin size={14} /> {ct("cr_pa_pin")}
          </TeacherActionButton>
          <TeacherActionButton
            disabled={!handRaised}
            onClick={() => runAction(() => onLowerHand?.(learnerName))}
            title={ct("cr_pa_lower_hint")}
          >
            <Hand size={14} /> {ct("cr_hand_lower")}
          </TeacherActionButton>
          <TeacherActionButton
            kind="danger"
            disabled={!canControl}
            onClick={() =>
              runAction(() => onRemoveParticipant?.(liveParticipant?.id, learnerUserId, learnerName))
            }
            title={ct("cr_pa_remove_hint")}
          >
            <UserX size={14} /> {ct("cr_pa_remove")}
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
        <span>{ct("cr_pa_actions")}</span>
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
  teacherUserId = null,
  learners,
  buildDisplayName,
  isTeacher = false,
  // Tile id -> account id (announced by each client, stamped by the server),
  // whether this browser is in the call, and who is viewing.
  identities = new Map(),
  selfInCall = false,
  viewerUserId = null,
  raisedHands = [],
  videoParticipants = [],
  videoControlsReady = false,
  isClassroomLocked = false,
  moderationNotice = "",
  onMuteAll,
  onStopAllVideo,
  onMuteParticipant,
  onStopParticipantVideo,
  onPinParticipant,
  onRemoveParticipant,
  onLowerHand,
  onToggleClassroomLock,
  locale = "en",
}) {
  const ct = useClassroomText();
  if (!show) return null;
  const seatLabel = (status) => {
    const key = `cr_seat_${status}`;
    const text = ct(key);
    return text === key ? status : text;
  };

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
  const roster = buildClassroomRoster({
    teacherName,
    teacherUserId,
    learners: safeLearners,
    learnerName: (learner) => getLearnerDisplayName(learner, buildDisplayName),
    liveParticipants,
    identities,
    selfInCall,
    viewerIsTeacher: isTeacher,
    viewerUserId,
  });
  const liveTeacher = roster.teacherLive;
  const learnerRows = roster.learnerRows.map((row, idx) => ({
    ...row,
    key: row.learner.id || row.learner.userId || idx,
    handRaised: raisedHandNames.has(normalizeName(row.learnerName)),
  }));
  const unmatchedLiveParticipants = roster.unmatched;

  const participantCountLabel = `${formatNumber(participantCount, locale)}${
    capacity ? `/${formatNumber(capacity, locale)}` : ""
  }`;
  const liveCountLabel = formatNumber(roster.inCallCount, locale);

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
                {ct("cr_pm_title")}
              </h2>
              <p className="cr-participants-header__summary">
                {ct("cr_pm_summary", { live: liveCountLabel, total: participantCountLabel })}
              </p>
            </div>
          </div>
          <button
            className="cr-modal__close cr-participants-header__close"
            onClick={() => setShowParticipantList(false)}
            aria-label={ct("cr_pm_close")}
          >
            <X size={20} />
          </button>
        </header>

        <div className="cr-modal__body cr-participants-body" data-lenis-prevent>
          {isTeacher && (
            <section className="cr-participants-controls" aria-label={ct("cr_classroom_controls")}>
              <div className="cr-participants-controls__copy">
                <span className="cr-participants-controls__eyebrow">{ct("cr_classroom_controls")}</span>
                <span className="cr-participants-controls__state">
                  <span className={`cr-participants-controls__dot ${isClassroomLocked ? "is-locked" : ""}`} />
                  {isClassroomLocked ? ct("cr_pm_locked") : ct("cr_pm_allowed")}
                </span>
              </div>
              <div className="cr-participants-controls__actions">
                <TeacherActionButton
                  disabled={!videoControlsReady}
                  onClick={onMuteAll}
                  title={ct("cr_pm_mute_all_hint")}
                >
                  <MicOff size={15} /> {ct("cr_pm_mute_all")}
                </TeacherActionButton>
                <TeacherActionButton
                  disabled={!videoControlsReady}
                  onClick={onStopAllVideo}
                  title={ct("cr_pm_cams_off_hint")}
                >
                  <VideoOff size={15} /> {ct("cr_pm_cams_off")}
                </TeacherActionButton>
                <TeacherActionButton
                  kind={isClassroomLocked ? "secondary" : "danger"}
                  onClick={() => onToggleClassroomLock?.(!isClassroomLocked)}
                  title={
                    isClassroomLocked
                      ? ct("cr_pm_unlock_hint")
                      : ct("cr_pm_lock_hint")
                  }
                >
                  {isClassroomLocked ? <Unlock size={15} /> : <Lock size={15} />}
                  {isClassroomLocked ? ct("cr_pm_unlock") : ct("cr_pm_lock")}
                </TeacherActionButton>
              </div>
              {moderationNotice && (
                <p className="cr-participants-controls__notice" role="status">
                  {moderationNotice}
                </p>
              )}
            </section>
          )}

          <section className="cr-participants-roster" aria-label={ct("cr_pm_roster")}>
            <div className="cr-participants-roster__heading">
              <div>
                <span className="cr-participants-roster__eyebrow">{ct("cr_pm_roster")}</span>
                <h3>{ct("cr_pm_in_room", { n: liveCountLabel })}</h3>
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
                    <span className="cr-participant-row__role">{ct("cr_teacher")}</span>
                  </div>
                  <span className={`cr-participant-row__status ${liveTeacher ? "is-live" : ""}`}>
                    <span className="cr-participant-row__status-dot" />
                    {liveTeacher ? ct("cr_pm_in_call") : ct("cr_pm_not_joined")}
                  </span>
                </div>
              </article>

              {safeLearners.length === 0 ? (
                <p className="cr-participants-roster__empty">{ct("cr_pm_no_learners")}</p>
              ) : (
                learnerRows.map(({ key, learner, learnerName, liveParticipant, inCall, handRaised }) => (
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
                          <span className="cr-participant-row__status-tag">{seatLabel(learner.status)}</span>
                        )}
                      </div>
                      <span className={`cr-participant-row__status ${inCall ? "is-live" : ""}`}>
                        <span className="cr-participant-row__status-dot" />
                        {inCall ? ct("cr_pm_in_call") : ct("cr_pm_not_joined")}
                        {handRaised && (
                          <span className="cr-participant-row__hand">
                            <Hand size={13} /> {ct("cr_pm_hand_raised")}
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
                        onStopParticipantVideo={onStopParticipantVideo}
                        onPinParticipant={onPinParticipant}
                        onLowerHand={onLowerHand}
                        onRemoveParticipant={onRemoveParticipant}
                        learnerName={learnerName}
                        learnerUserId={learner.id ?? learner.userId ?? null}
                      />
                    )}
                  </article>
                ))
              )}

              {isTeacher && unmatchedLiveParticipants.length > 0 && (
                <>
                  <div className="cr-participants-roster__subheading">{ct("cr_pm_other")}</div>
                  {unmatchedLiveParticipants.map((participant) => (
                    <article key={participant.id} className="cr-participant-row">
                      <span className="cr-participant-row__avatar" aria-hidden="true">
                        <UserRound size={19} />
                      </span>
                      <div className="cr-participant-row__identity">
                        <div className="cr-participant-row__name-line">
                          <span className="cr-participant-row__name">
                            {participant.displayName || ct("cr_participant")}
                          </span>
                          <span className="cr-participant-row__role">{ct("cr_pm_guest")}</span>
                        </div>
                        <span className="cr-participant-row__status is-live">
                          <span className="cr-participant-row__status-dot" /> {ct("cr_pm_in_call")}
                        </span>
                      </div>
                      <ParticipantActions
                        liveParticipant={participant}
                        videoControlsReady={videoControlsReady}
                        onMuteParticipant={onMuteParticipant}
                        onStopParticipantVideo={onStopParticipantVideo}
                        onPinParticipant={onPinParticipant}
                        onRemoveParticipant={onRemoveParticipant}
                        learnerName={participant.displayName}
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
