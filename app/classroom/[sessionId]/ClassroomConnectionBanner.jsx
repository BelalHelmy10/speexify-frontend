"use client";

import { RotateCw, WifiOff } from "lucide-react";

export default function ClassroomConnectionBanner({ channel, onRejoin }) {
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
            ? "Live sync stopped. Rejoin the classroom to restore messages and layout updates."
            : "Reconnecting... messages may be delayed."}
        </span>
      </div>

      {reconnectFailed ? (
        <button
          type="button"
          className="cr-connection-banner__btn cr-connection-banner__btn--danger"
          onClick={onRejoin}
        >
          Rejoin
        </button>
      ) : (
        <button
          type="button"
          className="cr-connection-banner__btn"
          onClick={channel?.retryNow}
        >
          Retry now
        </button>
      )}
    </div>
  );
}
