import { createRoot } from "react-dom/client";
import LessonRecap from "../../../components/lesson/LessonRecap.jsx";

// Renders the lesson recap the way the session page does, with a stand-in for
// the homework panel.
const props = window.feedbackTest.props || {};
const homework = props.withHomework ? (
  <section className="test-homework">
    <h2>Homework</h2>
    <p>Opinion writing</p>
  </section>
) : null;

createRoot(document.getElementById("root")).render(
  <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
    <LessonRecap
      sessionId={42}
      locale={props.locale || "en"}
      prefix={props.locale === "ar" ? "/ar" : ""}
      teacherFeedback={window.feedbackTest.session.teacherFeedback}
      canTeach={Boolean(props.canTeach)}
      isLearner={!props.canTeach}
      progressHref="/dashboard/progress"
      homework={homework}
    />
  </main>
);
