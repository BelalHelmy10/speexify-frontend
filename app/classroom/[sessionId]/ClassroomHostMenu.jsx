// app/classroom/[sessionId]/ClassroomHostMenu.jsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { useClassroomText } from "./classroomText";

/**
 * Host Controls popover.
 *
 * One gear icon in the bottom control bar that opens a small dropdown
 * with teacher-only preferences ("set-and-forget" toggles). Keeps the
 * always-visible bar focused on in-the-moment actions and leaves room
 * to add future host settings without further bloating the bar.
 */
export default function ClassroomHostMenu({
  teacherAllowsFollowing,
  onTeacherAllowsFollowingChange,
  teacherAllowsScreenShare,
  onTeacherAllowsScreenShareChange,
}) {
  const ct = useClassroomText();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  // Close on outside click.
  useEffect(() => {
    if (!isOpen) return;
    const handleDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const handleFollowingChange = useCallback(
    (value) => {
      onTeacherAllowsFollowingChange?.(Boolean(value));
    },
    [onTeacherAllowsFollowingChange]
  );

  const handleScreenShareChange = useCallback(
    (value) => {
      onTeacherAllowsScreenShareChange?.(Boolean(value));
    },
    [onTeacherAllowsScreenShareChange]
  );

  return (
    <div className="cr-host-menu" ref={rootRef}>
      <button
        type="button"
        className={
          "cr-controls__btn cr-controls__btn--ghost cr-host-menu__trigger" +
          (isOpen ? " cr-controls__btn--active" : "")
        }
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ct("cr_host_controls")}
        title={ct("cr_host_controls")}
      >
        <span className="cr-controls__btn-icon">
          <Settings size={16} />
        </span>
        <span className="cr-controls__btn-label cr-controls__btn-label--collapsible">
          {ct("cr_host")}
        </span>
      </button>

      {isOpen && (
        <div
          className="cr-host-menu__panel"
          role="menu"
          aria-label={ct("cr_host_controls")}
        >
          <div className="cr-host-menu__header">{ct("cr_host_controls")}</div>

          <label className="cr-host-menu__row">
            <span className="cr-host-menu__row-text">
              <span className="cr-host-menu__row-title">
                {ct("cr_host_follow_title")}
              </span>
              <span className="cr-host-menu__row-desc">
                {ct("cr_host_follow_desc")}
              </span>
            </span>
            <span className="cr-host-menu__switch">
              <input
                type="checkbox"
                className="cr-controls__toggle-input"
                checked={Boolean(teacherAllowsFollowing)}
                onChange={(e) => handleFollowingChange(e.target.checked)}
              />
              <span className="cr-controls__toggle-slider" />
            </span>
          </label>

          <label className="cr-host-menu__row">
            <span className="cr-host-menu__row-text">
              <span className="cr-host-menu__row-title">
                {ct("cr_host_share_title")}
              </span>
              <span className="cr-host-menu__row-desc">
                {ct("cr_host_share_desc")}
              </span>
            </span>
            <span className="cr-host-menu__switch">
              <input
                type="checkbox"
                className="cr-controls__toggle-input"
                checked={Boolean(teacherAllowsScreenShare)}
                onChange={(e) => handleScreenShareChange(e.target.checked)}
              />
              <span className="cr-controls__toggle-slider" />
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
