"use client";

import { BookOpen, Circle, MessageSquare, Square, Users } from "lucide-react";

export default function ClassroomControlBar({
  isMobile,
  isTeacher,
  setIsPickerOpen,
  isPageRecording,
  stopPageRecording,
  startPageRecording,
  isGroup,
  setShowParticipantList,
  participantCount,
  focusMode,
  FOCUS_MODE_ORDER,
  focusModeLabel,
  focusModeIcon,
  resetToMode,
  customSplit,
  setCustomSplit,
  teacherAllowsFollowing,
  setTeacherAllowsFollowing,
  learnerWantsToFollow,
  setLearnerWantsToFollow,
  isChatOpen,
  setIsChatOpen,
  chatUnreadCount,
}) {
  if (isMobile) return null;

  return (
    <footer className="cr-controls">
      <div className="cr-controls__left">
        {isTeacher && (
          <button
            className="cr-controls__btn cr-controls__btn--primary"
            onClick={() => setIsPickerOpen(true)}
          >
            <span className="cr-controls__btn-icon"><BookOpen size={16} /></span>
            <span className="cr-controls__btn-label">Resources</span>
          </button>
        )}

        {isTeacher && (
          <button
            className="cr-controls__btn cr-controls__btn--secondary"
            onClick={isPageRecording ? stopPageRecording : startPageRecording}
          >
            <span className="cr-controls__btn-icon">
              {isPageRecording ? <Square size={16} fill="currentColor" /> : <Circle size={16} fill="#ef4444" />}
            </span>
            <span className="cr-controls__btn-label">
              {isPageRecording ? "Stop recording" : "Record class"}
            </span>
          </button>
        )}

        {isGroup && (
          <button
            className="cr-controls__btn cr-controls__btn--secondary"
            onClick={() => setShowParticipantList(true)}
          >
            <span className="cr-controls__btn-icon"><Users size={16} /></span>
            <span className="cr-controls__btn-label">
              Participants ({participantCount})
            </span>
          </button>
        )}
      </div>

      <div className="cr-controls__center">
        <div className="cr-focus-switcher">
          {FOCUS_MODE_ORDER.map((mode) => (
            <button
              key={mode}
              type="button"
              className={
                "cr-focus-btn" +
                (focusMode === mode ? " cr-focus-btn--active" : "")
              }
              onClick={() => resetToMode(mode)}
              aria-pressed={focusMode === mode}
              aria-label={focusModeLabel[mode]}
              title={focusModeLabel[mode]}
            >
              <span className="cr-controls__btn-icon">
                {focusModeIcon[mode]}
              </span>
            </button>
          ))}
        </div>

        {customSplit !== null && (
          <button
            className="cr-controls__reset"
            onClick={() => setCustomSplit(null)}
            title="Reset to preset layout"
          >
            Reset
          </button>
        )}
      </div>

      <div className="cr-controls__right">
        {isTeacher && (
          <label className="cr-controls__toggle-wrapper">
            <input
              type="checkbox"
              className="cr-controls__toggle-input"
              checked={teacherAllowsFollowing}
              onChange={(e) => setTeacherAllowsFollowing(e.target.checked)}
            />
            <span className="cr-controls__toggle-slider"></span>
            <span className="cr-controls__toggle-label">
              Learners follow layout
            </span>
          </label>
        )}

        {!isTeacher && (
          <label className="cr-controls__toggle-wrapper">
            <input
              type="checkbox"
              className="cr-controls__toggle-input"
              checked={learnerWantsToFollow}
              onChange={(e) => setLearnerWantsToFollow(e.target.checked)}
              disabled={!teacherAllowsFollowing}
            />
            <span className="cr-controls__toggle-slider"></span>
            <span className="cr-controls__toggle-label">
              {!teacherAllowsFollowing
                ? "Following disabled by teacher"
                : learnerWantsToFollow
                  ? "Following layout"
                  : "Free layout"}
            </span>
          </label>
        )}

        <button
          className="cr-controls__btn cr-controls__btn--ghost"
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          <span className="cr-controls__btn-icon"><MessageSquare size={16} /></span>
          <span className="cr-controls__btn-label">
            {isChatOpen
              ? "Hide Chat"
              : chatUnreadCount > 0
                ? `Show Chat (${chatUnreadCount})`
                : "Show Chat"}
          </span>
        </button>
      </div>
    </footer>
  );
}
