"use client";

import { GraduationCap, UserRound, Users } from "lucide-react";

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
}) {
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
      </div>

      <div className="cr-header__right">
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
