// app/classroom/[sessionId]/ClassroomScreenShare.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Monitor, MonitorOff, ShieldOff, Volume2, X } from "lucide-react";
import useFocusTrap from "@/hooks/useFocusTrap";
import { canShareScreen } from "@/lib/classroomScreenShare.mjs";
import useClassroomScreenStream from "./useClassroomScreenStream";
import { useClassroomText } from "./classroomText";

/* ─────────────────────────────────────────────────────────────
   Hook: own the cross-side screen-share state
   - The screen itself is captured in this page and sent browser to
     browser (useClassroomScreenStream), so it can be shown in the
     content panel. Who is presenting comes from server-stamped events.
   - The teacher's "allow learners to share" gate travels over the
     classroom channel (teacher-only event on the server).
───────────────────────────────────────────────────────────── */
export function useClassroomScreenShare(
  classroomChannel,
  {
    userName = "",
    userId = "",
    isTeacher = false,
    sessionId = "",
  } = {}
) {
  const [teacherAllowsScreenShare, setTeacherAllowsScreenShare] = useState(true);

  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => { });
  const subscribe = classroomChannel?.subscribe ?? (() => () => { });

  const stream = useClassroomScreenStream({
    channel: classroomChannel,
    sessionId,
    userId,
    userName,
    isTeacher,
    allowLearners: teacherAllowsScreenShare,
  });
  const isLocalSharer = stream.isLocal;
  const remoteSharer = useMemo(
    () => (stream.remote ? { id: stream.remote.userId, name: stream.remote.name } : null),
    [stream.remote]
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
    stream,
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
  const ct = useClassroomText();
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
          ? ct("cr_ss_you_presenting")
          : ct("cr_ss_presenting", { name: sharerName })}
      </div>
      {isLocalSharer && onStop && (
        <button
          type="button"
          className="cr-screenshare-banner__stop"
          onClick={onStop}
          aria-label={ct("cr_ss_stop_aria")}
        >
          <X size={14} />
          <span>{ct("cr_ss_stop_presenting")}</span>
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Confirmation modal shown before the OS picker.
───────────────────────────────────────────────────────────── */
// Renders **bold** parts of a translated sentence.
function withBold(text) {
  return String(text)
    .split("**")
    .map((part, index) => (index % 2 ? <strong key={index}>{part}</strong> : part));
}

export function ClassroomScreenShareConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
}) {
  const ct = useClassroomText();
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
            {ct("cr_ss_confirm_title")}
          </h2>
          <button
            type="button"
            className="cr-modal__close"
            onClick={onCancel}
            aria-label={ct("cr_close")}
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
              {ct("cr_ss_confirm_lead")}
            </p>
            <ul className="cr-screenshare-confirm__tips">
              <li>
                <Monitor size={14} aria-hidden="true" />
                <span>{withBold(ct("cr_ss_tip_window"))}</span>
              </li>
              <li>
                <Volume2 size={14} aria-hidden="true" />
                <span>{withBold(ct("cr_ss_tip_audio"))}</span>
              </li>
              <li>
                <ShieldOff size={14} aria-hidden="true" />
                <span>{withBold(ct("cr_ss_tip_screen"))}</span>
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
            {ct("cr_cancel")}
          </button>
          <button
            type="button"
            className="cr-controls__btn cr-controls__btn--primary"
            onClick={onConfirm}
            autoFocus
          >
            <Monitor size={16} />
            <span>{ct("cr_ss_choose")}</span>
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
  const ct = useClassroomText();
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
        title={ct("cr_ss_blocked")}
        aria-label={ct("cr_ss_blocked")}
      >
        <span className="cr-controls__btn-icon">
          <MonitorOff size={16} />
        </span>
        <span className="cr-controls__btn-label">{ct("cr_ss_off")}</span>
      </button>
    );
  }

  if (isLocalSharer) {
    return (
      <button
        type="button"
        className="cr-controls__btn cr-controls__btn--danger"
        onClick={onStop}
        title={ct("cr_ss_stop_aria")}
        aria-label={ct("cr_ss_stop_aria")}
      >
        <span className="cr-controls__btn-icon">
          <MonitorOff size={16} />
        </span>
        <span className="cr-controls__btn-label">{ct("cr_ss_stop")}</span>
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
          ? ct("cr_ss_busy")
          : ct("cr_ss_share")
      }
      aria-label={ct("cr_ss_share")}
    >
      <span className="cr-controls__btn-icon">
        <Monitor size={16} />
      </span>
      <span className="cr-controls__btn-label">
        {isRemoteSharing ? ct("cr_ss_in_progress") : ct("cr_ss_share_short")}
      </span>
    </button>
  );
}
