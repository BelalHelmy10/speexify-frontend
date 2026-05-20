// app/classroom/[sessionId]/ClassroomLateJoinBanner.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, BookOpen, MessageSquare, X, ChevronRight } from "lucide-react";

/* -----------------------------------------------------------
   Late-Join Banner — Shows when a learner joins after the
   session has already started, helping them catch up.

   Props:
     - elapsedMinutes: how many minutes late they are
     - currentResourceTitle: the resource the teacher is on
     - recentMessages: last 5 chat messages [{id, senderName, text, time}]
     - onDismiss: callback to close the banner
     - onOpenChat: callback to open the chat panel
----------------------------------------------------------- */
export default function ClassroomLateJoinBanner({
  elapsedMinutes = 0,
  currentResourceTitle,
  recentMessages = [],
  onDismiss,
  onOpenChat,
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 30000);
    return () => clearTimeout(timeout);
  }, [onDismiss]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!isVisible || elapsedMinutes < 1) return null;

  const elapsedLabel =
    elapsedMinutes >= 60
      ? `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`
      : `${elapsedMinutes} minute${elapsedMinutes !== 1 ? "s" : ""}`;

  return (
    <div className="cr-late-join" role="status" aria-live="polite">
      {/* Header row */}
      <div className="cr-late-join__header">
        <div className="cr-late-join__header-left">
          <div className="cr-late-join__icon">
            <Clock size={14} />
          </div>
          <div className="cr-late-join__headline">
            <strong>Class started {elapsedLabel} ago</strong>
            <span>— catch up on what's been covered</span>
          </div>
        </div>

        <div className="cr-late-join__header-actions">
          <button
            type="button"
            className="cr-late-join__toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <ChevronRight
              size={14}
              className={`cr-late-join__chevron ${isExpanded ? "cr-late-join__chevron--open" : ""}`}
            />
          </button>
          <button
            type="button"
            className="cr-late-join__close"
            onClick={handleDismiss}
            aria-label="Dismiss catch-up banner"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="cr-late-join__body">
          {/* Current resource */}
          {currentResourceTitle && (
            <div className="cr-late-join__section">
              <div className="cr-late-join__section-icon">
                <BookOpen size={13} />
              </div>
              <div className="cr-late-join__section-content">
                <span className="cr-late-join__label">Currently on</span>
                <span className="cr-late-join__value">{currentResourceTitle}</span>
              </div>
            </div>
          )}

          {/* Recent messages */}
          {recentMessages.length > 0 && (
            <div className="cr-late-join__section cr-late-join__section--messages">
              <div className="cr-late-join__section-icon">
                <MessageSquare size={13} />
              </div>
              <div className="cr-late-join__section-content">
                <span className="cr-late-join__label">
                  Recent messages ({recentMessages.length})
                </span>
                <ul className="cr-late-join__messages">
                  {recentMessages.map((msg) => (
                    <li key={msg.id} className="cr-late-join__msg">
                      <strong>{msg.senderName}</strong>
                      <span>{msg.text}</span>
                    </li>
                  ))}
                </ul>
                {onOpenChat && (
                  <button
                    type="button"
                    className="cr-late-join__chat-link"
                    onClick={() => {
                      onOpenChat();
                      handleDismiss();
                    }}
                  >
                    Open full chat →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
