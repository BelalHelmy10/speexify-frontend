"use client";

import { memo, useState } from "react";
import { useSessionTiming } from "./classroomTime";
import { ChevronLeft, GraduationCap, UserRound, Users } from "lucide-react";
import { useClassroomText } from "./classroomText";

/* ─── WS status map ───────────────────────────────────────────────────── */
const WS_STATUSES = new Set([
  "ready",
  "connecting",
  "joining",
  "awaiting_admission",
  "forbidden",
  "reconnecting",
  "error",
  "closed",
  "idle",
]);
const VIDEO_STATES = new Set(["connecting", "connected", "waiting", "reconnecting", "failed"]);

/* ─── Signal strength bars (3-bar) ────────────────────────────────────── */
const LEVEL_TO_BARS = { excellent: 3, good: 3, fair: 2, poor: 1, unknown: 0 };
const LEVEL_TO_COLOR = {
  excellent: "var(--cr-accent-success, #15803d)",
  good: "var(--cr-accent-success, #15803d)",
  fair: "var(--cr-accent-teacher, #f59e0b)",
  poor: "var(--cr-accent-danger, #ef4444)",
  unknown: "var(--cr-text-muted, #64748b)",
};

function SignalBars({ level = "unknown", size = 16 }) {
  const bars = LEVEL_TO_BARS[level] ?? 0;
  const active = LEVEL_TO_COLOR[level] || LEVEL_TO_COLOR.unknown;
  const muted = "var(--cr-border-default, #334155)";
  const h = [5, 9, 13]; // bar heights (bottom-aligned)
  const w = 3;
  const gap = 2;
  const totalW = w * 3 + gap * 2;
  const totalH = 13;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${totalW} ${totalH}`}
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {h.map((barH, i) => (
        <rect
          key={i}
          x={i * (w + gap)}
          y={totalH - barH}
          width={w}
          height={barH}
          rx={1}
          fill={i < bars ? active : muted}
          opacity={i < bars ? 1 : 0.3}
        />
      ))}
    </svg>
  );
}

/* ─── Connection popover ──────────────────────────────────────────────── */
function ConnectionPopover({ wsStatus, wsLabel, networkQuality, videoLabel }) {
  const ct = useClassroomText();
  const nq = networkQuality || {};
  const wsOk = wsStatus === "ready";
  const latency = Number.isFinite(Number(nq.latencyMs)) ? Math.round(Number(nq.latencyMs)) : null;
  const quality = Number.isFinite(Number(nq.quality)) ? Math.round(Number(nq.quality)) : null;

  return (
    <div className="cr-conn-popover">
      <div className="cr-conn-popover__title">{ct("cr_conn_details")}</div>

      <div className="cr-conn-popover__row">
        <span className="cr-conn-popover__label">{ct("cr_conn_classroom")}</span>
        <span className={`cr-conn-popover__value cr-conn-popover__value--${wsOk ? "ok" : "warn"}`}>
          {wsLabel}
        </span>
      </div>

      <div className="cr-conn-popover__row">
        <span className="cr-conn-popover__label">{ct("cr_conn_video")}</span>
        <span className="cr-conn-popover__value">{videoLabel}</span>
      </div>

      <div className="cr-conn-popover__row">
        <span className="cr-conn-popover__label">{ct("cr_conn_network")}</span>
        <span className={`cr-conn-popover__value cr-conn-popover__value--${nq.level || "unknown"}`}>
          {nq.label || ct("cr_conn_na")}
        </span>
      </div>

      {latency !== null && (
        <div className="cr-conn-popover__row">
          <span className="cr-conn-popover__label">{ct("cr_conn_latency")}</span>
          <span className="cr-conn-popover__value">{latency}ms</span>
        </div>
      )}

      {quality !== null && (
        <div className="cr-conn-popover__row">
          <span className="cr-conn-popover__label">{ct("cr_conn_quality")}</span>
          <div className="cr-conn-popover__bar-track">
            <div
              className={`cr-conn-popover__bar-fill cr-conn-popover__bar-fill--${nq.level || "unknown"}`}
              style={{ width: `${quality}%` }}
            />
          </div>
          <span className="cr-conn-popover__value">{quality}%</span>
        </div>
      )}
    </div>
  );
}

function getNetworkQualityText(networkQuality) {
  if (!networkQuality?.label) return "";
  if (Number.isFinite(Number(networkQuality.latencyMs))) {
    return `${networkQuality.label} · ${Math.round(Number(networkQuality.latencyMs))}ms`;
  }
  return networkQuality.label;
}

function ClassroomHeaderBar({
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
  networkQuality,
  videoConnectionState = "connecting",
  startedAt,
  endAt,
  locale = "en",
  compact = false,
}) {
  const ct = useClassroomText();
  const [showConnPopover, setShowConnPopover] = useState(false);
  const timing = useSessionTiming({ startedAt, endAt, locale });
  const wsInfo = { label: ct(`cr_ws_${WS_STATUSES.has(wsStatus) ? wsStatus : "idle"}`) };
  const videoLabel = VIDEO_STATES.has(videoConnectionState)
    ? ct(`cr_video_state_${videoConnectionState}`)
    : videoConnectionState;
  const networkQualityText = getNetworkQualityText(networkQuality);
  const networkQualityLevel = networkQuality?.level || "unknown";

  const combinedLevel =
    wsStatus === "error" || wsStatus === "closed" || videoConnectionState === "failed"
      ? "poor"
      : videoConnectionState === "connected"
        ? networkQualityLevel === "unknown" ? "good" : networkQualityLevel
        : "unknown";

  const countdownWarningLevel = isTeacher ? timing.warningLevel : null;
  const displayElapsedLabel = timing.displayElapsedLabel || timing.elapsedLabel;
  const endsInClassName = [
    "cr-header__pill-timer",
    "cr-header__pill-timer--ends",
    countdownWarningLevel ? `cr-header__pill-timer--${countdownWarningLevel}` : "",
    timing.hasEnded ? "cr-header__pill-timer--ended" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={`cr-header${compact ? " cr-header--compact" : ""}`}>
      {/* ── Left: Back / Leave ── */}
      <div className="cr-header__left">
        <a
          href={`${prefix}/dashboard`}
          className="cr-header__back"
          onClick={(e) => {
            e.preventDefault();
            setShowLeaveConfirm(true);
          }}
          title={ct("cr_leave_classroom")}
        >
          <ChevronLeft size={18} className="cr-flip-rtl" />
          <span className="cr-header__back-label">{ct("cr_leave")}</span>
        </a>
      </div>

      {/* ── Center: Title ── */}
      <div className="cr-header__center">
        <div className="cr-header__resource-name">
          {headerTitle} • {typeLabel}
          {isGroup ? ` • ${countLabel}` : ""}
        </div>
      </div>

      {/* ── Right: Session pill + Role badge ── */}
      <div className="cr-header__right">
        {/* Session pill: signal + elapsed + countdown clustered */}
        <div className="cr-header__session-pill">
          {/* Signal strength indicator with hover popover */}
          <span
            className="cr-header__pill-signal"
            onMouseEnter={() => setShowConnPopover(true)}
            onMouseLeave={() => setShowConnPopover(false)}
            onClick={() => setShowConnPopover((open) => !open)}
            aria-label={ct("cr_conn_aria", { ws: wsInfo.label, video: videoLabel })}
          >
            <SignalBars level={combinedLevel} size={16} />

            {showConnPopover && (
              <ConnectionPopover
                wsStatus={wsStatus}
                wsLabel={wsInfo.label}
                networkQuality={networkQuality}
                videoLabel={videoLabel}
              />
            )}
          </span>

          {displayElapsedLabel && (
            <span className={`cr-header__pill-timer${timing.hasEnded ? " cr-header__pill-timer--ended" : ""}`}>
              <span className="cr-header__pill-dot" />
              {displayElapsedLabel}
            </span>
          )}

          {timing.endMs && (
            <span className={endsInClassName}>
              <span className="cr-header__pill-sep">|</span>
              {timing.hasEnded ? ct("cr_ended") : timing.remainingLabel}
            </span>
          )}

          {networkQualityText && (
            <span
              className={`cr-header__pill-net cr-header__pill-net--${networkQualityLevel}`}
              aria-label={ct("cr_network_aria", { text: networkQualityText })}
            >
              <span className="cr-header__pill-sep">|</span>
              {networkQualityText}
            </span>
          )}
        </div>

        <span
          className="cr-header__role-badge"
          data-role={isTeacher ? "teacher" : "learner"}
        >
          {isTeacher ? <UserRound size={14} /> : <GraduationCap size={14} />}
          {isTeacher ? teacherName : learnerName}
        </span>

        {isGroup && (
          <button
            type="button"
            className="cr-header__participants-btn"
            onClick={() => setShowParticipantList(true)}
            title={ct("cr_view_participants")}
          >
            <Users size={14} />
            <span>{countLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
}

export default memo(ClassroomHeaderBar);
