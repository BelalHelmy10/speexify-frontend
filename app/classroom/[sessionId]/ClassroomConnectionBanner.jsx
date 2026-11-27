"use client";

import { RotateCw, WifiOff } from "lucide-react";
import { useClassroomText } from "./classroomText";

export default function ClassroomConnectionBanner({ channel, onRejoin }) {
  const ct = useClassroomText();
  const reconnectAttempt = Number(channel?.reconnectAttempt) || 0;
  const reconnectFailed = Boolean(channel?.reconnectFailed);
  const shouldShowReconnecting =
    !reconnectFailed &&
    reconnectAttempt >= 2 &&
    (channel?.status === "reconnecting" ||
      channel?.status === "error" ||
      channel?.isReconnecting);

  if (!reconnectFailed && !shouldShowReconnecting) return null;

  return (
    <div
      className={[
        "cr-connection-banner",
        reconnectFailed ? "cr-connection-banner--failed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
    >
      <div className="cr-connection-banner__content">
        {reconnectFailed ? (
          <WifiOff size={18} aria-hidden="true" />
        ) : (
          <RotateCw size={18} aria-hidden="true" />
        )}
        <span>
          {reconnectFailed
            ? ct("cr_sync_stopped")
            : ct("cr_sync_reconnecting")}
        </span>
      </div>

      {reconnectFailed ? (
        <button
          type="button"
          className="cr-connection-banner__btn cr-connection-banner__btn--danger"
          onClick={onRejoin}
        >
          {ct("cr_rejoin")}
        </button>
      ) : (
        <button
          type="button"
          className="cr-connection-banner__btn"
          onClick={channel?.retryNow}
        >
          {ct("cr_retry_now")}
        </button>
      )}
    </div>
  );
}
