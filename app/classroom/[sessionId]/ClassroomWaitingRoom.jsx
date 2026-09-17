// app/classroom/[sessionId]/ClassroomWaitingRoom.jsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, Users, Shield, Wifi, WifiOff, Sparkles } from "lucide-react";

/* -----------------------------------------------------------
   Waiting Room — Learner-facing lobby while awaiting teacher
   admission to a group session.
   
   Props:
     - sessionId: current session ID
     - sessionInfo: { teacherName, sessionTitle, startTime, participantCount, capacity }
     - userName: current learner's display name
     - status: "waiting" | "admitted" | "denied" | "error" | "ended"
     - wsConnected: boolean indicating WS connection status
     - onRetry: callback to retry lobby join
     - onLeave: callback to leave waiting room
----------------------------------------------------------- */
export default function ClassroomWaitingRoom({
  sessionId,
  sessionInfo = {},
  userName = "Learner",
  locale = "en",
  status = "waiting",
  wsConnected = false,
  onRetry,
  onLeave,
}) {
  const [elapsed, setElapsed] = useState(0);
  const [dotCount, setDotCount] = useState(0);
  const startRef = useRef(Date.now());

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = useCallback((seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }, []);

  const dots = ".".repeat(dotCount);
  const isArabic = locale === "ar";

  const {
    teacherName = "your teacher",
    sessionTitle,
    startTime,
    participantCount,
    capacity,
  } = sessionInfo;

  if (["denied", "ended", "error"].includes(status)) {
    const isEnded = status === "ended";
    const isError = status === "error";
    return (
      <div className={`cr-waiting-room cr-waiting-room--${status}`} dir={isArabic ? "rtl" : "ltr"}>
        <div className="cr-waiting-room__orbs" aria-hidden="true">
          <span className="cr-waiting-room__orb cr-waiting-room__orb--1" />
          <span className="cr-waiting-room__orb cr-waiting-room__orb--2" />
        </div>

        <div className="cr-waiting-room__card">
          <div className="cr-waiting-room__icon-ring cr-waiting-room__icon-ring--denied">
            {isError ? <WifiOff size={28} /> : <Shield size={28} />}
          </div>

          <h1 className="cr-waiting-room__title">
            {isEnded
              ? isArabic ? "انتهت الجلسة" : "Session Ended"
              : isError
                ? isArabic ? "مشكلة في الاتصال" : "Connection Problem"
                : isArabic ? "لم تتم الموافقة على الدخول" : "Entry Not Approved"}
          </h1>
          <p className="cr-waiting-room__subtitle">
            {isEnded
              ? isArabic ? "هذه الجلسة لم تعد متاحة." : "This classroom session is no longer available."
              : isError
                ? isArabic ? "تعذر التحقق من دخولك. تحقق من الاتصال وحاول مرة أخرى." : "We could not verify your admission. Check your connection and try again."
                : isArabic ? "لم يسمح لك المعلم بالدخول بعد. قد تكون الجلسة ممتلئة أو بدأت بالفعل." : "The teacher has not admitted you to this session. This may be because the session is full or has already started."}
          </p>

          <div className="cr-waiting-room__actions">
            {onRetry && !isEnded && (
              <button
                type="button"
                className="cr-waiting-room__btn cr-waiting-room__btn--secondary"
                onClick={onRetry}
              >
                {isError ? (isArabic ? "حاول مرة أخرى" : "Try again") : isArabic ? "اطلب الدخول مرة أخرى" : "Request again"}
              </button>
            )}
            {onLeave && (
              <button
                type="button"
                className="cr-waiting-room__btn cr-waiting-room__btn--ghost"
                onClick={onLeave}
              >
                {isArabic ? "← العودة إلى لوحة التحكم" : "← Back to dashboard"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cr-waiting-room" dir={isArabic ? "rtl" : "ltr"}>
      {/* Ambient background orbs */}
      <div className="cr-waiting-room__orbs" aria-hidden="true">
        <span className="cr-waiting-room__orb cr-waiting-room__orb--1" />
        <span className="cr-waiting-room__orb cr-waiting-room__orb--2" />
        <span className="cr-waiting-room__orb cr-waiting-room__orb--3" />
      </div>

      {/* Main card */}
      <div className="cr-waiting-room__card">
        {/* Pulse ring */}
        <div className="cr-waiting-room__icon-ring">
          <div className="cr-waiting-room__pulse" />
          <Sparkles size={24} />
        </div>

        {/* Status */}
        <span className="cr-waiting-room__eyebrow">{isArabic ? "غرفة الانتظار" : "Waiting Room"}</span>
        <h1 className="cr-waiting-room__title">
          {isArabic ? `في انتظار السماح بالدخول${dots}` : `Waiting for admission${dots}`}
        </h1>
        <p className="cr-waiting-room__subtitle">
          <strong>{teacherName}</strong> {isArabic ? "سيسمح لك بالدخول قريبًا." : "will let you in shortly."}
          <br />
          {isArabic ? "يرجى البقاء في هذه الصفحة." : "Please stay on this page."}
        </p>

        {/* Session meta */}
        <div className="cr-waiting-room__meta">
          {sessionTitle && (
            <div className="cr-waiting-room__meta-item">
            <span className="cr-waiting-room__meta-label">{isArabic ? "الجلسة" : "Session"}</span>
              <span className="cr-waiting-room__meta-value">{sessionTitle}</span>
            </div>
          )}
          <div className="cr-waiting-room__meta-item">
            <Clock size={14} />
            <span className="cr-waiting-room__meta-value">
                {isArabic ? `انتظار ${formatElapsed(elapsed)}` : `Waiting ${formatElapsed(elapsed)}`}
            </span>
          </div>
          {participantCount != null && capacity != null && (
            <div className="cr-waiting-room__meta-item">
              <Users size={14} />
              <span className="cr-waiting-room__meta-value">
                {isArabic ? `${participantCount}/${capacity} مشارك` : `${participantCount}/${capacity} participants`}
              </span>
            </div>
          )}
        </div>

        {/* Connection indicator */}
        <div
          className={`cr-waiting-room__connection ${
            wsConnected
              ? "cr-waiting-room__connection--ok"
              : "cr-waiting-room__connection--off"
          }`}
        >
          {wsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{wsConnected
            ? isArabic ? "متصل. في انتظار الموافقة" : "Connected. Listening for approval"
            : isArabic ? "جارٍ إعادة الاتصال…" : "Reconnecting…"}</span>
        </div>

        {/* Identity badge */}
        <div className="cr-waiting-room__identity">
          <div className="cr-waiting-room__avatar">
            {(userName || "L").charAt(0).toUpperCase()}
          </div>
          <div className="cr-waiting-room__identity-text">
            <strong>{userName}</strong>
            <span>{isArabic ? "ستنضم كمتعلم" : "You'll join as a learner"}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="cr-waiting-room__actions">
          {onLeave && (
            <button
              type="button"
              className="cr-waiting-room__btn cr-waiting-room__btn--ghost"
              onClick={onLeave}
            >
              {isArabic ? "مغادرة غرفة الانتظار" : "Leave waiting room"}
            </button>
          )}
        </div>
      </div>

      {/* Bottom ambient text */}
      <p className="cr-waiting-room__footer">
        {isArabic ? `Speexify • جلسة جماعية #${sessionId}` : `Speexify • Group Session #${sessionId}`}
      </p>
    </div>
  );
}
