"use client";

import { BookOpen, Circle, Download, MessageSquare, Square, Users } from "lucide-react";
import { ClassroomRaiseHandButton } from "./ClassroomRaiseHand";
import { ClassroomCaptionsButton } from "./ClassroomCaptions";
import { ClassroomScreenShareButton } from "./ClassroomScreenShare";

export default function ClassroomControlBar({
  isMobile,
  isTeacher,
  setIsPickerOpen,
  isPageRecording,
  pageRecError,
  pageRecWarning,
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
  onTeacherAllowsFollowingChange,
  learnerWantsToFollow,
  onLearnerWantsToFollowChange,
  isChatOpen,
  setIsChatOpen,
  chatUnreadCount,
  isHandRaised,
  toggleHand,
  captionsEnabled,
  captionsSupported,
  onToggleCaptions,
  captionsPausedForMute,
  onExportPage,
  hasResource,
  screenShareIsLocalSharer,
  screenShareIsRemoteSharing,
  screenShareBlockedByTeacher,
  onRequestStartScreenShare,
  onStopScreenShare,
  teacherAllowsScreenShare,
  onTeacherAllowsScreenShareChange,
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

        {isTeacher && pageRecWarning && (
          <span className="cr-controls__recording-warning" title={pageRecWarning}>
            Audio latency
          </span>
        )}

        {isTeacher && pageRecError && (
          <span className="cr-controls__recording-notice" role="status">
            {pageRecError}
          </span>
        )}

        {(isTeacher || isGroup) && (
          <button
            className="cr-controls__btn cr-controls__btn--secondary"
            onClick={() => setShowParticipantList(true)}
          >
            <span className="cr-controls__btn-icon"><Users size={16} /></span>
            <span className="cr-controls__btn-label">
              {isTeacher ? "Controls" : `Participants (${participantCount})`}
            </span>
          </button>
        )}

        <ClassroomScreenShareButton
          isLocalSharer={Boolean(screenShareIsLocalSharer)}
          isRemoteSharing={Boolean(screenShareIsRemoteSharing)}
          blockedByTeacher={Boolean(screenShareBlockedByTeacher)}
          onRequestStart={onRequestStartScreenShare}
          onStop={onStopScreenShare}
        />
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
        <ClassroomCaptionsButton
          enabled={captionsEnabled}
          supported={captionsSupported}
          onToggle={onToggleCaptions}
        />
        {captionsEnabled && captionsPausedForMute && (
          <span
            className="cr-controls__caption-hint"
            title="Captions resume when you unmute"
          >
            Captions paused (muted)
          </span>
        )}
        {hasResource && onExportPage && (
          <button
            className="cr-controls__btn cr-controls__btn--export"
            onClick={() => onExportPage("png")}
            title="Save annotated page as PNG"
          >
            <span className="cr-controls__btn-icon"><Download size={16} /></span>
            <span className="cr-controls__btn-label">Save page</span>
          </button>
        )}
        <ClassroomRaiseHandButton isHandRaised={isHandRaised} onToggleHand={toggleHand} />
        {isTeacher && (
          <label className="cr-controls__toggle-wrapper">
            <input
              type="checkbox"
              className="cr-controls__toggle-input"
              checked={teacherAllowsFollowing}
              onChange={(e) => onTeacherAllowsFollowingChange(e.target.checked)}
            />
            <span className="cr-controls__toggle-slider"></span>
            <span className="cr-controls__toggle-label">
              Learners follow layout
            </span>
          </label>
        )}

        {isTeacher && (
          <label
            className="cr-controls__toggle-wrapper"
            title="Allow learners to share their screen with the class"
          >
            <input
              type="checkbox"
              className="cr-controls__toggle-input"
              checked={Boolean(teacherAllowsScreenShare)}
              onChange={(e) =>
                onTeacherAllowsScreenShareChange?.(e.target.checked)
              }
            />
            <span className="cr-controls__toggle-slider"></span>
            <span className="cr-controls__toggle-label">
              Learners can share screen
            </span>
          </label>
        )}

        {!isTeacher && (
          <label className="cr-controls__toggle-wrapper">
            <input
              type="checkbox"
              className="cr-controls__toggle-input"
              checked={learnerWantsToFollow}
              onChange={(e) => onLearnerWantsToFollowChange(e.target.checked)}
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
          className={
            "cr-controls__btn cr-controls__btn--ghost" +
            (!isChatOpen && chatUnreadCount > 0 ? " cr-controls__btn--has-unread" : "")
          }
          onClick={() => setIsChatOpen(!isChatOpen)}
          aria-label={
            !isChatOpen && chatUnreadCount > 0
              ? `Show chat, ${chatUnreadCount} unread`
              : isChatOpen
                ? "Hide chat"
                : "Show chat"
          }
        >
          <span className="cr-controls__btn-icon cr-controls__btn-icon--dot-host">
            <MessageSquare size={16} />
            {!isChatOpen && chatUnreadCount > 0 && (
              <span className="cr-controls__btn-dot" aria-hidden="true" />
            )}
          </span>
          <span className="cr-controls__btn-label">
            {isChatOpen
              ? "Hide Chat"
              : chatUnreadCount > 0
                ? `Show Chat (${chatUnreadCount > 9 ? "9+" : chatUnreadCount})`
                : "Show Chat"}
          </span>
        </button>
      </div>
    </footer>
  );
}
