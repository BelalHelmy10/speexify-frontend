"use client";

import { Clock3 } from "lucide-react";
import { useClassroomText } from "./classroomText";

export default function ClassroomTimeWarning({ warningLevel, remainingLabel }) {
  const ct = useClassroomText();
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
        {isHard ? ct("cr_warn_hard_sr") : ct("cr_warn_soft_sr")}
      </span>
      <Clock3 size={16} aria-hidden="true" />
      <strong>{isHard ? ct("cr_warn_hard") : ct("cr_warn_soft")}</strong>
      <span>
        {isHard
          ? ct("cr_warn_hard_text", { time: remainingLabel })
          : ct("cr_warn_soft_text", { time: remainingLabel })}
      </span>
    </div>
  );
}
