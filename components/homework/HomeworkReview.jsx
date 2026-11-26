"use client";

import { useState } from "react";
import { CheckCheck, Save, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import HomeworkTask, { isTaskDone } from "./HomeworkTasks";
import { TaskCard } from "./HomeworkPlayer";
import { HomeworkStatusPill, ProgressBar } from "./HomeworkBits";
import { formatDue, homeworkCopy, isOverdue, relativeTime } from "./homeworkCopy";

/**
 * Teacher view: the learner's answers (live, even before they submit), the
 * automatic marks with the right answers, and a comment box per task.
 */
export default function HomeworkReview({ homework: initial, locale = "en", onRemoved }) {
  const c = homeworkCopy(locale);
  const { toast, confirmModal } = useToast();
  const [hw, setHw] = useState(initial);
  const [comments, setComments] = useState(() => ({ ...(initial.teacherComments || {}) }));
  const [busy, setBusy] = useState("");
  const tasks = hw.content?.tasks || [];
  const answers = hw.answers || {};
  const marks = hw.marks || { byTask: {}, fields: {} };
  const score = Object.values(marks.byTask || {}).reduce(
    (acc, t) => ({ correct: acc.correct + t.correct, total: acc.total + t.total }),
    { correct: 0, total: 0 }
  );
  const canFinish = hw.status === "SUBMITTED";

  async function save(markReviewed) {
    setBusy(markReviewed ? "review" : "save");
    try {
      const taskComments = Object.fromEntries(tasks.map((t) => [t.id, comments[t.id] || ""]));
      const res = await api.patch(`/homework/${hw.id}/review`, {
        comments: taskComments,
        overall: comments.overall || "",
        markReviewed,
      });
      setHw(res.data.homework);
      toast.success(markReviewed ? c.reviewedBanner : c.commentsSaved);
    } catch (e) {
      toast.error(e?.response?.data?.error || c.saveError);
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    const ok = await confirmModal(c.removeConfirm);
    if (!ok) return;
    try {
      await api.delete(`/homework/${hw.id}`);
      toast.success(c.removed);
      onRemoved?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || c.saveError);
    }
  }

  const setComment = (key, value) => setComments((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="hw-player hw-player--review">
      <header className="hw-head">
        <div className="hw-head__top">
          <span className="hw-level">{hw.level}</span>
          <HomeworkStatusPill status={hw.status} overdue={isOverdue(hw)} locale={locale} />
        </div>
        <h1 className="hw-title">{hw.title}</h1>
        <p className="hw-sub">
          <span>{c.learner}: <strong>{hw.learner?.name}</strong></span>
          {hw.dueAt && <span>{c.due}: {formatDue(hw.dueAt, locale)}</span>}
          <span>{c.lastActive}: {hw.lastActivityAt ? relativeTime(hw.lastActivityAt, locale) : c.never}</span>
        </p>
        <div className="hw-head__stats">
          <div className="hw-head__progress">
            <ProgressBar done={hw.completedTasks} total={hw.taskCount} />
            <span>{c.tasksDone(hw.completedTasks, hw.taskCount)}</span>
          </div>
          {score.total > 0 && (
            <span className="hw-score">
              {c.score}: <strong>{score.correct}/{score.total}</strong>
            </span>
          )}
        </div>
        {hw.note && (
          <div className="hw-note">
            <strong>{c.noteToLearner}</strong>
            <p dir="auto">{hw.note}</p>
          </div>
        )}
      </header>

      {tasks.map((task, i) => (
        <TaskCard
          key={task.id}
          task={task}
          index={i}
          total={tasks.length}
          c={c}
          aside={
            <span className="hw-card__status">
              {marks.byTask?.[task.id] && (
                <span className="hw-score hw-score--small">{marks.byTask[task.id].correct}/{marks.byTask[task.id].total}</span>
              )}
              <span className={isTaskDone(task, answers[task.id]) ? "hw-ok" : "hw-warn"}>
                {isTaskDone(task, answers[task.id]) ? c.done : c.notDone}
              </span>
            </span>
          }
        >
          <HomeworkTask task={task} value={answers[task.id] || {}} readOnly showKey marks={marks.fields?.[task.id]} locale={locale} />
          <label className="hw-comment-box">
            <span className="hw-part__label">{c.teacherComment}</span>
            <textarea
              id={`comment-${task.id}`}
              className="hw-textarea"
              rows={2}
              maxLength={3000}
              placeholder={c.commentPlaceholder}
              value={comments[task.id] || ""}
              onChange={(e) => setComment(task.id, e.target.value)}
            />
          </label>
        </TaskCard>
      ))}

      <section className="hw-card hw-review-bar">
        <label className="hw-comment-box">
          <span className="hw-part__label">{c.overallComment}</span>
          <textarea
            id="comment-overall"
            className="hw-textarea"
            rows={3}
            maxLength={3000}
            placeholder={c.overallPlaceholder}
            value={comments.overall || ""}
            onChange={(e) => setComment("overall", e.target.value)}
          />
        </label>
        {!canFinish && hw.status !== "REVIEWED" && <p className="hw-muted">{c.markReviewedWait}</p>}
        <div className="hw-nav">
          {(hw.status === "ASSIGNED" || hw.status === "IN_PROGRESS") ? (
            <button type="button" className="hw-btn hw-btn--danger" onClick={remove}>
              <Trash2 size={16} aria-hidden /> {c.remove}
            </button>
          ) : <span />}
          <span className="hw-nav__group">
            <button type="button" className="hw-btn hw-btn--ghost" onClick={() => save(false)} disabled={Boolean(busy)}>
              <Save size={16} aria-hidden /> {busy === "save" ? c.savingComments : c.saveComments}
            </button>
            {canFinish && (
              <button type="button" className="hw-btn hw-btn--primary" onClick={() => save(true)} disabled={Boolean(busy)}>
                <CheckCheck size={16} aria-hidden /> {c.markReviewed}
              </button>
            )}
          </span>
        </div>
      </section>
    </div>
  );
}
