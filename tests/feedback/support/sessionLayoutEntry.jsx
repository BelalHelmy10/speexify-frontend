import { createRoot } from "react-dom/client";
import SessionDetailLayout from "../../../app/dashboard/sessions/[id]/SessionDetailLayout.jsx";

// The real session page layout for a finished lesson, so tests can check
// where the lesson recap sits among the other panels.
const t = window.feedbackTest;
const txt = (_key, fallback) => fallback;
createRoot(document.getElementById("root")).render(
  <SessionDetailLayout
    txt={txt}
    locale="en"
    prefix=""
    dashboardHref="/dashboard"
    progressHref="/dashboard/progress"
    classroomHref="/classroom/42"
    sessionTitle="Voicing your opinion"
    sessionStatus="completed"
    statusConfig={{ label: "Completed", className: "" }}
    isGroup={false}
    isTraining={false}
    durationStr="45 min"
    timezone="Africa/Cairo"
    startAt="2026-11-26T12:30:00Z"
    endAt="2026-11-26T13:15:00Z"
    teacher={{ name: "Belal" }}
    learnerLabel="Learner"
    activeParticipants={[]}
    participantCount={1}
    attendanceParticipants={[]}
    sessionId={42}
    sessionIsTeacher={t.role === "teacher"}
    sessionIsAdmin={false}
    isLearner={t.role !== "teacher"}
    notes=""
    teacherFeedback={t.session.teacherFeedback}
    showSummary={false}
    showActions={false}
    formatDateTime={(v) => String(v)}
    formatHeroDate={() => "Thu, 26 Nov"}
    formatOpensTime={() => ""}
    renderJoinAside={() => null}
    loadSession={() => {}}
    joinWindow={{}}
  />
);
