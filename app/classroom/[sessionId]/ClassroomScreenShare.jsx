// app/classroom/[sessionId]/ClassroomScreenShare.jsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Monitor, MonitorOff, ShieldOff, Volume2, X } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Hook: own the cross-side screen-share state
   - Broadcasts when *I* start/stop sharing
   - Receives broadcasts so I know who else is sharing
   - Owns the teacher's "allow learners to share" gate
───────────────────────────────────────────────────────────── */
export function useClassroomScreenShare(
  classroomChannel,
  {
    userName = "",
    userId = "",
    isTeacher = false,
    isLocalSharing = false,
  } = {}
) {
  const [remoteSharer, setRemoteSharer] = useState(null);
  const [teacherAllowsScreenShare, setTeacherAllowsScreenShare] = useState(true);

  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => { });
  const subscribe = classroomChannel?.subscribe ?? (() => () => { });

  // Broadcast local share state changes. We deduplicate so a re-render
  // doesn't spam the WS with the same on/off signal.
  const lastBroadcastRef = useRef(null);
  useEffect(() => {
    if (!ready) return;
    const sig = isLocalSharing ? `on:${userId}` : `off:${userId}`;
    if (lastBroadcastRef.current === sig) return;
    lastBroadcastRef.current = sig;

    send({
      type: "SCREEN_SHARE",
      on: !!isLocalSharing,
      sharerName: userName || "",
      sharerId: userId || "",
      at: Date.now(),
    });
  }, [ready, send, isLocalSharing, userName, userId]);

  // Reset our broadcast memory when the channel reconnects so the next
  // state transition fires a fresh broadcast.
  useEffect(() => {
    if (!ready) {
      lastBroadcastRef.current = null;
      setRemoteSharer(null);
    }
  }, [ready]);

  // Receive other people's share state.
  useEffect(() => {
    if (!ready) return;
    const unsub = subscribe((msg) => {
      if (!msg) return;

      if (msg.type === "SCREEN_SHARE") {
        const sharerId = msg.sharerId || "";
        if (sharerId && userId && sharerId === userId) return; // self-echo
        if (msg.on) {
          setRemoteSharer({
            id: sharerId,
            name: msg.sharerName || "Someone",
            at: Number(msg.at) || Date.now(),
          });
        } else {
          setRemoteSharer((prev) => {
            if (!prev) return null;
            if (!sharerId || prev.id === sharerId) return null;
            return prev;
          });
        }
        return;
      }

      // Teacher's allow-screen-share preference is broadcast by the teacher.
      if (msg.type === "SCREEN_SHARE_ALLOW") {
        if (isTeacher) return; // teacher owns this, ignore echoes
        setTeacherAllowsScreenShare(Boolean(msg.allow));
        return;
      }

      // When a teacher joins or a learner reconnects, ask for the current
      // allow setting so we render the right gate.
      if (msg.type === "SCREEN_SHARE_ALLOW_REQUEST" && isTeacher) {
        send({
          type: "SCREEN_SHARE_ALLOW",
          allow: teacherAllowsScreenShare,
          at: Date.now(),
        });
        return;
      }
    });
    return unsub;
  }, [ready, subscribe, userId, isTeacher, send, teacherAllowsScreenShare]);

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

  const isLocalSharer = !!isLocalSharing;
  const isRemoteSharing = !!remoteSharer;
  const isSomeoneSharing = isLocalSharer || isRemoteSharing;

  return {
    isSomeoneSharing,
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
        <span className="cr-screenshare-banner__dot" />
        <Monitor size={16} />
      </div>
      <div className="cr-screenshare-banner__text">
        {isLocalSharer
          ? "You are sharing your screen with the class"
          : `${sharerName} is sharing their screen`}
      </div>
      {isLocalSharer && onStop && (
        <button
          type="button"
          className="cr-screenshare-banner__stop"
          onClick={onStop}
          aria-label="Stop sharing your screen"
        >
          <X size={14} />
          <span>Stop sharing</span>
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
  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="cr-modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cr-screenshare-confirm-title"
    >
      <div
        className="cr-modal cr-modal--small"
        onClick={(e) => e.stopPropagation()}
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
              Your browser will ask you to pick a window, a tab, or your
              entire screen. The class will see exactly what you choose.
            </p>
            <ul className="cr-screenshare-confirm__tips">
              <li>
                <Volume2 size={14} aria-hidden="true" />
                <span>
                  Pick <strong>“This Tab”</strong> if you want the class to
                  hear audio (e.g. a video clip).
                </span>
              </li>
              <li>
                <ShieldOff size={14} aria-hidden="true" />
                <span>
                  If you share <strong>your entire screen</strong>, close
                  anything sensitive first.
                </span>
              </li>
              <li>
                <X size={14} aria-hidden="true" />
                <span>
                  You can stop sharing any time from the banner at the top
                  of the classroom or the bottom control bar.
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
