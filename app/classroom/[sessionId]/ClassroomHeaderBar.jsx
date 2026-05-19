"use client";

import { useEffect, useMemo, useState } from "react";
import { GraduationCap, UserRound, Users, Wifi, WifiOff } from "lucide-react";

/* ─── Elapsed Timer ────────────────────────────────────────────────────── */
function parseTimestampMs(value) {
  if (!value) return null;

  const timestamp =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatElapsedTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

function useElapsedTime(startedAt) {
  const startMs = useMemo(() => parseTimestampMs(startedAt), [startedAt]);
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    const tick = () => {
      if (!startMs) {
        setElapsed("00:00");
        return;
      }

      const diff = Math.max(0, Date.now() - startMs);
      const totalSeconds = Math.floor(diff / 1000);
      setElapsed(formatElapsedTime(totalSeconds));
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [startMs]);

  return elapsed;
}

/* ─── Connection Status Dot ───────────────────────────────────────────── */
const WS_STATUS_MAP = {
  ready: { color: "var(--cr-accent-success, #22c55e)", label: "Connected" },
  connecting: { color: "var(--cr-accent-teacher, #f59e0b)", label: "Connecting…" },
  reconnecting: { color: "var(--cr-accent-teacher, #f59e0b)", label: "Reconnecting…" },
  error: { color: "var(--cr-accent-danger, #ef4444)", label: "Connection error" },
  closed: { color: "var(--cr-text-muted, #64748b)", label: "Disconnected" },
  idle: { color: "var(--cr-text-muted, #64748b)", label: "Idle" },
};

export default function ClassroomHeaderBar({
  prefix,
  setShowLeaveConfirm,
  headerTitle,
  typeLabel,
  isGroup,
  countLabel,
  isTeacher,
  teacherName,
  learnerName,
  setShowParticipantList,
  wsStatus,
  startedAt,
}) {
  const elapsed = useElapsedTime(startedAt);
  const wsInfo = WS_STATUS_MAP[wsStatus] || WS_STATUS_MAP.idle;

  return (
    <header className="cr-header">
      <div className="cr-header__left">
        <a
          href={`${prefix}/dashboard`}
          className="cr-header__leave"
          onClick={(e) => {
            e.preventDefault();
            setShowLeaveConfirm(true);
          }}
          title="Leave classroom"
        >
          <span aria-hidden="true">←</span>
          <span>Leave</span>
        </a>
      </div>

      <div className="cr-header__center">
        <div className="cr-header__resource-name">
          {headerTitle} • {typeLabel}
          {isGroup ? ` • ${countLabel} participants` : ""}
        </div>

        {/* Session elapsed timer */}
        {elapsed && (
          <div className="cr-header__timer" title="Session elapsed time">
            <span className="cr-header__timer-dot" />
            {elapsed}
          </div>
        )}
      </div>

      <div className="cr-header__right">
        {/* Connection quality indicator */}
        <span
          className="cr-header__ws-status"
          title={wsInfo.label}
          aria-label={wsInfo.label}
        >
          {wsStatus === "ready" ? (
            <Wifi size={14} style={{ color: wsInfo.color }} />
          ) : wsStatus === "error" || wsStatus === "closed" ? (
            <WifiOff size={14} style={{ color: wsInfo.color }} />
          ) : (
            <Wifi size={14} style={{ color: wsInfo.color }} />
          )}
        </span>

        <span
          className="cr-header__role-badge"
          data-role={isTeacher ? "teacher" : "learner"}
        >
          {isTeacher ? <UserRound size={16} /> : <GraduationCap size={16} />} {isTeacher ? teacherName : learnerName}
        </span>

        {isGroup && (
          <button
            type="button"
            className="cr-header__leave"
            onClick={() => setShowParticipantList(true)}
            title="View participants"
          >
            <Users size={16} /> <span>{countLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
}
