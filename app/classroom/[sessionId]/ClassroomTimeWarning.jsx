"use client";

import { Clock3 } from "lucide-react";

export default function ClassroomTimeWarning({ warningLevel, remainingLabel }) {
  if (!warningLevel) return null;

  const isHard = warningLevel === "hard";

  return (
    <div
      className={`cr-time-warning cr-time-warning--${warningLevel}`}
    >
      <span
        className="sr-only"
        role="status"
        aria-live={isHard ? "assertive" : "polite"}
      >
        {isHard
          ? "1-minute warning. Session is in the final minute."
          : "5-minute warning. Session is in the wrap-up window."}
      </span>
      <Clock3 size={16} aria-hidden="true" />
      <strong>{isHard ? "1-minute warning" : "5-minute warning"}</strong>
      <span>
        {isHard
          ? `Session ends in ${remainingLabel}. Close the class now.`
          : `Session ends in ${remainingLabel}. Start wrapping up.`}
      </span>
    </div>
  );
}
