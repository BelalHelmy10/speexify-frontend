// app/classroom/[sessionId]/ClassroomScreenShare.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Monitor, MonitorOff, ShieldOff, Volume2, X } from "lucide-react";
import useFocusTrap from "@/hooks/useFocusTrap";
import { canShareScreen, resolveScreenShareState } from "@/lib/classroomScreenShare.mjs";

/* ─────────────────────────────────────────────────────────────
   Hook: own the cross-side screen-share state
   - Who is presenting comes from Jitsi (contentSharingParticipantsChanged),
     which cannot be spoofed by another classroom client.
   - The teacher's "allow learners to share" gate travels over the
     classroom channel (teacher-only event on the server).
───────────────────────────────────────────────────────────── */
export function useClassroomScreenShare(
  classroomChannel,
  {
    userName = "",
    userId = "",
    isTeacher = false,
    isLocalSharing = false,
    jitsiSharing = null,
  } = {}
) {
  const [teacherAllowsScreenShare, setTeacherAllowsScreenShare] = useState(true);

  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => { });
  const subscribe = classroomChannel?.subscribe ?? (() => () => { });

  const { isLocalSharer, remoteSharer } = useMemo(
    () => resolveScreenShareState({
      sharingIds: jitsiSharing?.sharingIds || [],
      localId: jitsiSharing?.localId || null,
      participants: jitsiSharing?.participants || new Map(),
      localSharing: isLocalSharing,
    }),
    [jitsiSharing, isLocalSharing]
  );

  const teacherAllowsRef = useRef(teacherAllowsScreenShare);
  teacherAllowsRef.current = teacherAllowsScreenShare;

  useEffect(() => {
    if (!ready) return;
    return subscribe((msg) => {
      if (!msg) return;

      // Teacher's allow-screen-share preference is broadcast by the teacher.
      if (msg.type === "SCREEN_SHARE_ALLOW") {
        if (isTeacher) return; // teacher owns this, ignore echoes
        setTeacherAllowsScreenShare(Boolean(msg.allow));
        return;
      }

      // When a learner joins or reconnects, it asks for the current setting.
      if (msg.type === "SCREEN_SHARE_ALLOW_REQUEST" && isTeacher) {
        send({
          type: "SCREEN_SHARE_ALLOW",
          allow: teacherAllowsRef.current,
          at: Date.now(),
        });
      }
    });
  }, [ready, subscribe, isTeacher, send]);

  // Learners ask for the current allow setting once on connect.
  useEffect(() => {
    if (!ready || isTeacher) return;
    send({ type: "SCREEN_SHARE_ALLOW_REQUEST", at: Date.now() });
  }, [ready, isTeacher, send]);

  const updateTeacherAllowsScreenShare = useCallback(
    (value) => {
      if (!isTeacher) return;
      const next = Boolean(value);
      setTeacherAllowsScreenShare(next);
      if (ready) {
        send({
          type: "SCREEN_SHARE_ALLOW",
          allow: next,
          at: Date.now(),
        });
      }
    },
    [isTeacher, ready, send]
  );

  const isRemoteSharing = !!remoteSharer;

  return {
    isSomeoneSharing: isLocalSharer || isRemoteSharing,
    isLocalSharer,
    isRemoteSharing,
    remoteSharer,
    sharerName: isLocalSharer ? userName || "You" : remoteSharer?.name || "",
    sharerId: isLocalSharer ? userId : remoteSharer?.id || null,
    teacherAllowsScreenShare,
    setTeacherAllowsScreenShare: updateTeacherAllowsScreenShare,
  };
}

/* ─────────────────────────────────────────────────────────────
   Sticky banner shown when anyone is sharing.
───────────────────────────────────────────────────────────── */
export function ClassroomScreenShareBanner({
  visible,
  sharerName,
  isLocalSharer,
  onStop,
}) {
  if (!visible) return null;

  return (
    <div
      className={
        "cr-screenshare-banner" +
        (isLocalSharer ? " cr-screenshare-banner--mine" : "")
      }
      role="status"
      aria-live="polite"
    >
      <div className="cr-screenshare-banner__icon" aria-hidden="true">
        <Monitor size={16} />
      </div>
      <div className="cr-screenshare-banner__text">
        {isLocalSharer
          ? "You're presenting"
          : `${sharerName} is presenting`}
      </div>
      {isLocalSharer && onStop && (
        <button
          type="button"
          className="cr-screenshare-banner__stop"
          onClick={onStop}
          aria-label="Stop sharing your screen"
        >
          <X size={14} />
          <span>Stop presenting</span>
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Confirmation modal shown before the OS picker.
───────────────────────────────────────────────────────────── */
export function ClassroomScreenShareConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
}) {
  const modalRef = useFocusTrap(Boolean(isOpen), { onEscape: onCancel });

  if (!isOpen) return null;

  return (
    <div
      className="cr-modal-overlay"
      onClick={onCancel}
    >
      <div
        ref={modalRef}
        className="cr-modal cr-modal--small"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cr-screenshare-confirm-title"
      >
        <div className="cr-modal__header">
          <h2 id="cr-screenshare-confirm-title" className="cr-modal__title">
            Share your screen?
          </h2>
          <button
            type="button"
            className="cr-modal__close"
            onClick={onCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="cr-modal__body">
          <div className="cr-screenshare-confirm">
            <div className="cr-screenshare-confirm__icon">
              <Monitor size={36} />
            </div>
            <p className="cr-screenshare-confirm__lead">
              Your browser will ask what to share. The class will see exactly
              what you choose, and your lesson stays open here.
            </p>
            <ul className="cr-screenshare-confirm__tips">
              <li>
                <Monitor size={14} aria-hidden="true" />
                <span>
                  Pick a <strong>window</strong> (for example a document or a
                  slide deck). Don&apos;t pick this classroom tab: the class
                  would see a mirror of the call.
                </span>
              </li>
              <li>
                <Volume2 size={14} aria-hidden="true" />
                <span>
                  To play a video with sound, open it in another browser tab
                  and choose <strong>that tab</strong> with
                  <strong> “Share tab audio”</strong> turned on.
                </span>
              </li>
              <li>
                <ShieldOff size={14} aria-hidden="true" />
                <span>
                  If you share <strong>your entire screen</strong>, close
                  anything private first.
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="cr-modal__footer">
          <button
            type="button"
            className="cr-controls__btn cr-controls__btn--ghost"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="cr-controls__btn cr-controls__btn--primary"
            onClick={onConfirm}
            autoFocus
          >
            <Monitor size={16} />
            <span>Choose what to share</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Share / Stop button for the control bar.
───────────────────────────────────────────────────────────── */
export function ClassroomScreenShareButton({
  isLocalSharer,
  isRemoteSharing,
  blockedByTeacher,
  onRequestStart,
  onStop,
}) {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(canShareScreen(window));
  }, []);

  // Phones and tablets cannot share a screen from the browser; offering a
  // button that silently does nothing makes the classroom feel broken.
  if (!supported && !isLocalSharer) return null;

  if (blockedByTeacher) {
    return (
      <button
        type="button"
        className="cr-controls__btn cr-controls__btn--ghost"
        disabled
        title="Screen sharing is disabled by the teacher"
        aria-label="Screen sharing is disabled by the teacher"
      >
        <span className="cr-controls__btn-icon">
          <MonitorOff size={16} />
        </span>
        <span className="cr-controls__btn-label">Sharing off</span>
      </button>
    );
  }

  if (isLocalSharer) {
    return (
      <button
        type="button"
        className="cr-controls__btn cr-controls__btn--danger"
        onClick={onStop}
        title="Stop sharing your screen"
        aria-label="Stop sharing your screen"
      >
        <span className="cr-controls__btn-icon">
          <MonitorOff size={16} />
        </span>
        <span className="cr-controls__btn-label">Stop sharing</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="cr-controls__btn cr-controls__btn--secondary"
      onClick={onRequestStart}
      disabled={isRemoteSharing}
      title={
        isRemoteSharing
          ? "Someone else is already sharing"
          : "Share your screen"
      }
      aria-label="Share your screen"
    >
      <span className="cr-controls__btn-icon">
        <Monitor size={16} />
      </span>
      <span className="cr-controls__btn-label">
        {isRemoteSharing ? "Sharing in progress" : "Share screen"}
      </span>
    </button>
  );
}
