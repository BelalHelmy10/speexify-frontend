"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Circle,
  Download,
  Hand,
  Maximize,
  Mic,
  MicOff,
  Minimize,
  MessageSquare,
  MoreHorizontal,
  RotateCcw,
  Square,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { ClassroomRaiseHandButton } from "./ClassroomRaiseHand";
import { ClassroomCaptionsButton } from "./ClassroomCaptions";
import { ClassroomScreenShareButton } from "./ClassroomScreenShare";
import ClassroomHostMenu from "./ClassroomHostMenu";
import ClassroomUnreadBadge from "./ClassroomUnreadBadge";
import {
  getUnreadChatLabel,
  normalizeUnreadCount,
} from "@/lib/classroomChatUnread.mjs";

export default function ClassroomControlBar({
  isMobile,
  variant = "full",
  micMuted = true,
  cameraMuted = false,
  onToggleMic,
  onToggleCamera,
  isTeacher,
  setIsPickerOpen,
  isPageRecording,
  pageRecError,
  clearPageRecError,
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

  const unreadCount = normalizeUnreadCount(chatUnreadCount);
  const hasUnread = !isChatOpen && unreadCount > 0;

  const controls = (
    <>
      <div className="cr-controls__left">
        {isTeacher && (
          <button
            className="cr-controls__btn cr-controls__btn--primary"
            onClick={() => setIsPickerOpen(true)}
            aria-label="Choose resource"
            title="Choose resource"
          >
            <span className="cr-controls__btn-icon"><BookOpen size={16} /></span>
            <span className="cr-controls__btn-label">Resources</span>
          </button>
        )}

        {isTeacher && (
          <button
            className="cr-controls__btn cr-controls__btn--secondary cr-controls__btn--icon-only"
            onClick={isPageRecording ? stopPageRecording : startPageRecording}
            title={isPageRecording ? "Stop recording" : "Record class"}
            aria-label={isPageRecording ? "Stop recording" : "Record class"}
          >
            <span className="cr-controls__btn-icon">
              {isPageRecording ? (
                <Square size={16} fill="currentColor" />
              ) : (
                <Circle size={16} fill="#ef4444" />
              )}
            </span>
            <span className="cr-controls__sheet-label">
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
            <button
              type="button"
              className="cr-controls__recording-notice-dismiss"
              onClick={clearPageRecError}
              aria-label="Dismiss recording error"
            >
              <X size={12} />
            </button>
          </span>
        )}

        {(isTeacher || isGroup) && (
          <button
            className="cr-controls__btn cr-controls__btn--secondary"
            onClick={() => setShowParticipantList(true)}
            aria-label={isTeacher ? "Open classroom controls" : `Show ${participantCount} participants`}
            title={isTeacher ? "Open classroom controls" : `Show ${participantCount} participants`}
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
            className="cr-controls__btn cr-controls__btn--ghost cr-controls__btn--icon-only"
            onClick={() => setCustomSplit(null)}
            title="Reset to preset layout"
            aria-label="Reset to preset layout"
          >
            <span className="cr-controls__btn-icon">
              <RotateCcw size={16} />
            </span>
            <span className="cr-controls__sheet-label">Reset layout</span>
          </button>
        )}
      </div>

      <div className="cr-controls__right">
        <ClassroomCaptionsButton
          enabled={captionsEnabled}
          supported={captionsSupported}
          onToggle={onToggleCaptions}
          iconOnly
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
            className="cr-controls__btn cr-controls__btn--export cr-controls__btn--icon-only"
            onClick={() => onExportPage("png")}
            title="Save annotated page as PNG"
            aria-label="Save annotated page as PNG"
          >
            <span className="cr-controls__btn-icon">
              <Download size={16} />
            </span>
            <span className="cr-controls__sheet-label">Save page</span>
          </button>
        )}
        <ClassroomRaiseHandButton isHandRaised={isHandRaised} onToggleHand={toggleHand} />
        {isTeacher && (
          <ClassroomHostMenu
            teacherAllowsFollowing={teacherAllowsFollowing}
            onTeacherAllowsFollowingChange={onTeacherAllowsFollowingChange}
            teacherAllowsScreenShare={teacherAllowsScreenShare}
            onTeacherAllowsScreenShareChange={onTeacherAllowsScreenShareChange}
          />
        )}

        {!isTeacher && (
          <label className="cr-controls__toggle-wrapper">
            <input
              type="checkbox"
              className="cr-controls__toggle-input"
              checked={learnerWantsToFollow}
              onChange={(e) => onLearnerWantsToFollowChange(e.target.checked)}
              disabled={!teacherAllowsFollowing}
              aria-label="Follow teacher layout"
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
          type="button"
          className={
            "cr-controls__btn cr-controls__btn--chat" +
            (isChatOpen ? " cr-controls__btn--chat-open" : "") +
            (hasUnread ? " cr-controls__btn--has-unread" : "")
          }
          onClick={() => setIsChatOpen(!isChatOpen)}
          aria-expanded={isChatOpen}
          aria-controls="classroom-chat-drawer"
          aria-label={
            hasUnread
              ? `Open chat, ${getUnreadChatLabel(unreadCount)}`
              : isChatOpen
                ? "Close chat"
                : "Open chat"
          }
        >
          <span className="cr-controls__btn-icon cr-controls__btn-icon--badge-host">
            <MessageSquare size={16} />
            <ClassroomUnreadBadge
              count={hasUnread ? unreadCount : 0}
              className="cr-chat-unread-badge--desktop"
            />
          </span>
          <span className="cr-controls__btn-label">
            {isChatOpen ? "Close chat" : "Chat"}
          </span>
        </button>
      </div>
    </>
  );

  if (variant === "compact") {
    return (
      <ClassroomCompactDock
        isTeacher={isTeacher}
        micMuted={micMuted}
        cameraMuted={cameraMuted}
        onToggleMic={onToggleMic}
        onToggleCamera={onToggleCamera}
        isHandRaised={isHandRaised}
        toggleHand={toggleHand}
        setIsPickerOpen={setIsPickerOpen}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        hasUnread={hasUnread}
        unreadCount={unreadCount}
        isPageRecording={isPageRecording}
      >
        {controls}
      </ClassroomCompactDock>
    );
  }

  return <footer className="cr-controls">{controls}</footer>;
}

function useFullscreen() {
  const [state, setState] = useState({ supported: false, active: false, ios: false });

  useEffect(() => {
    const update = () => {
      const ua = navigator.userAgent || "";
      setState({
        supported: Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen),
        active: Boolean(document.fullscreenElement),
        // iPhone Safari has no page fullscreen; Add to Home Screen hides the bars.
        ios: /iPhone|iPod/.test(ua) && !window.matchMedia("(display-mode: standalone)").matches,
      });
    };
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.({ navigationUI: "hide" }).catch(() => {});
    }
  }, []);

  return { ...state, toggle };
}

// Phones in landscape: the main buttons sit under the video, and everything
// else from the desktop control bar opens in a sheet.
function ClassroomCompactDock({
  isTeacher,
  micMuted,
  cameraMuted,
  onToggleMic,
  onToggleCamera,
  isHandRaised,
  toggleHand,
  setIsPickerOpen,
  isChatOpen,
  setIsChatOpen,
  hasUnread,
  unreadCount,
  isPageRecording,
  children,
}) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreButtonRef = useRef(null);
  const fullscreen = useFullscreen();

  const closeMore = useCallback(() => setIsMoreOpen(false), []);

  useEffect(() => {
    if (!isMoreOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setIsMoreOpen(false);
      moreButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMoreOpen]);

  // Buttons that open a dialog or change something close the sheet. The host
  // menu opens its own panel inside the sheet, so it keeps the sheet open.
  const handleSheetClick = (event) => {
    const button = event.target.closest?.("button");
    if (!button || button.closest(".cr-host-menu")) return;
    setIsMoreOpen(false);
  };

  return (
    <div className="cr-dock">
      <div className="cr-dock__row" role="toolbar" aria-label="Classroom controls">
        <button
          type="button"
          className={`cr-dock__btn${micMuted ? " cr-dock__btn--off" : ""}`}
          onClick={onToggleMic}
          disabled={!onToggleMic}
          aria-pressed={!micMuted}
          aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
          title={micMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button
          type="button"
          className={`cr-dock__btn${cameraMuted ? " cr-dock__btn--off" : ""}`}
          onClick={onToggleCamera}
          disabled={!onToggleCamera}
          aria-pressed={!cameraMuted}
          aria-label={cameraMuted ? "Turn camera on" : "Turn camera off"}
          title={cameraMuted ? "Turn camera on" : "Turn camera off"}
        >
          {cameraMuted ? <VideoOff size={18} /> : <Video size={18} />}
        </button>
        {isTeacher ? (
          <button
            type="button"
            className="cr-dock__btn cr-dock__btn--primary"
            onClick={() => setIsPickerOpen(true)}
            aria-label="Choose resource"
            title="Choose resource"
          >
            <BookOpen size={18} />
          </button>
        ) : (
          <button
            type="button"
            className={`cr-dock__btn${isHandRaised ? " cr-dock__btn--active" : ""}`}
            onClick={toggleHand}
            aria-pressed={Boolean(isHandRaised)}
            aria-label={isHandRaised ? "Lower hand" : "Raise hand"}
            title={isHandRaised ? "Lower hand" : "Raise hand"}
          >
            <Hand size={18} fill={isHandRaised ? "currentColor" : "none"} />
          </button>
        )}
        <button
          type="button"
          className={
            "cr-dock__btn" +
            (isChatOpen ? " cr-dock__btn--active" : "") +
            (hasUnread ? " cr-dock__btn--has-unread" : "")
          }
          onClick={() => setIsChatOpen(!isChatOpen)}
          aria-expanded={isChatOpen}
          aria-controls="classroom-chat-drawer"
          aria-label={
            hasUnread
              ? `Open chat, ${getUnreadChatLabel(unreadCount)}`
              : isChatOpen
                ? "Close chat"
                : "Open chat"
          }
          title="Chat"
        >
          <span className="cr-controls__btn-icon--badge-host">
            <MessageSquare size={18} />
            <ClassroomUnreadBadge
              count={hasUnread ? unreadCount : 0}
              className="cr-chat-unread-badge--desktop"
            />
          </span>
        </button>
        <button
          ref={moreButtonRef}
          type="button"
          className={`cr-dock__btn${isMoreOpen ? " cr-dock__btn--active" : ""}`}
          onClick={() => setIsMoreOpen((open) => !open)}
          aria-expanded={isMoreOpen}
          aria-controls="classroom-more-sheet"
          aria-label="More controls"
          title="More controls"
        >
          <MoreHorizontal size={18} />
          {isPageRecording && <span className="cr-dock__recording-dot" aria-hidden="true" />}
        </button>
      </div>

      {/* The video column contains its layout, so the sheet is portalled out
          of it to position against the screen. */}
      {isMoreOpen && createPortal(
        <>
          <div className="cr-more-backdrop" onClick={closeMore} aria-hidden="true" />
          <div
            id="classroom-more-sheet"
            className="cr-more-sheet"
            role="dialog"
            aria-label="More classroom controls"
            onClick={handleSheetClick}
            data-lenis-prevent
          >
            <div className="cr-more-sheet__header">
              <span>More controls</span>
              <button
                type="button"
                className="cr-more-sheet__close"
                onClick={closeMore}
                aria-label="Close more controls"
              >
                <X size={16} />
              </button>
            </div>
            <div className="cr-controls cr-controls--sheet">{children}</div>
            {fullscreen.supported && (
              <button
                type="button"
                className="cr-more-sheet__fullscreen"
                onClick={fullscreen.toggle}
              >
                {fullscreen.active ? <Minimize size={16} /> : <Maximize size={16} />}
                <span>{fullscreen.active ? "Exit full screen" : "Full screen"}</span>
              </button>
            )}
            {!fullscreen.supported && fullscreen.ios && (
              <p className="cr-more-sheet__tip">
                To hide Safari&apos;s bars, tap Share, then Add to Home Screen, and open
                Speexify from there.
              </p>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
