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
     - status: "waiting" | "admitted" | "denied"
     - wsConnected: boolean indicating WS connection status
     - onRetry: callback to retry lobby join
     - onLeave: callback to leave waiting room
----------------------------------------------------------- */
export default function ClassroomWaitingRoom({
  sessionId,
  sessionInfo = {},
  userName = "Learner",
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

  const {
    teacherName = "your teacher",
    sessionTitle,
    startTime,
    participantCount,
    capacity,
  } = sessionInfo;

  if (status === "denied") {
    return (
      <div className="cr-waiting-room cr-waiting-room--denied">
        <div className="cr-waiting-room__orbs" aria-hidden="true">
          <span className="cr-waiting-room__orb cr-waiting-room__orb--1" />
          <span className="cr-waiting-room__orb cr-waiting-room__orb--2" />
        </div>

        <div className="cr-waiting-room__card">
          <div className="cr-waiting-room__icon-ring cr-waiting-room__icon-ring--denied">
            <Shield size={28} />
          </div>

          <h1 className="cr-waiting-room__title">Entry Not Approved</h1>
          <p className="cr-waiting-room__subtitle">
            The teacher has not admitted you to this session. This may be
            because the session is full or has already started.
          </p>

          <div className="cr-waiting-room__actions">
            {onRetry && (
              <button
                type="button"
                className="cr-waiting-room__btn cr-waiting-room__btn--secondary"
                onClick={onRetry}
              >
                Request again
              </button>
            )}
            {onLeave && (
              <button
                type="button"
                className="cr-waiting-room__btn cr-waiting-room__btn--ghost"
                onClick={onLeave}
              >
                ← Back to dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cr-waiting-room">
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
        <span className="cr-waiting-room__eyebrow">Waiting Room</span>
        <h1 className="cr-waiting-room__title">
          Waiting for admission{dots}
        </h1>
        <p className="cr-waiting-room__subtitle">
          <strong>{teacherName}</strong> will let you in shortly.
          <br />
          Please stay on this page.
        </p>

        {/* Session meta */}
        <div className="cr-waiting-room__meta">
          {sessionTitle && (
            <div className="cr-waiting-room__meta-item">
              <span className="cr-waiting-room__meta-label">Session</span>
              <span className="cr-waiting-room__meta-value">{sessionTitle}</span>
            </div>
          )}
          <div className="cr-waiting-room__meta-item">
            <Clock size={14} />
            <span className="cr-waiting-room__meta-value">
              Waiting {formatElapsed(elapsed)}
            </span>
          </div>
          {participantCount != null && capacity != null && (
            <div className="cr-waiting-room__meta-item">
              <Users size={14} />
              <span className="cr-waiting-room__meta-value">
                {participantCount}/{capacity} participants
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
          <span>{wsConnected ? "Connected — listening for approval" : "Reconnecting…"}</span>
        </div>

        {/* Identity badge */}
        <div className="cr-waiting-room__identity">
          <div className="cr-waiting-room__avatar">
            {(userName || "L").charAt(0).toUpperCase()}
          </div>
          <div className="cr-waiting-room__identity-text">
            <strong>{userName}</strong>
            <span>You'll join as a learner</span>
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
              Leave waiting room
            </button>
          )}
        </div>
      </div>

      {/* Bottom ambient text */}
      <p className="cr-waiting-room__footer">
        Speexify • Group Session #{sessionId}
      </p>
    </div>
  );
}
