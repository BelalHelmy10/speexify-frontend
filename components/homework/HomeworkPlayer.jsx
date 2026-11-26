"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, CloudOff, Loader2, Send } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import HomeworkTask, { isTaskDone } from "./HomeworkTasks";
import { HomeworkStatusPill, ProgressBar } from "./HomeworkBits";
import { formatDue, homeworkCopy, isOverdue } from "./homeworkCopy";

const SAVE_DELAY_MS = 1000;
const RETRY_MS = 5000;
const backupKey = (id) => `spx-homework-${id}`;

function readBackup(id) {
  try {
    return JSON.parse(localStorage.getItem(backupKey(id)) || "null");
  } catch {
    return null;
  }
}
function writeBackup(id, value) {
  try {
    localStorage.setItem(backupKey(id), JSON.stringify(value));
  } catch {
    /* storage full or blocked: the server copy still works */
  }
}
function clearBackup(id) {
  try {
    localStorage.removeItem(backupKey(id));
  } catch {
    /* ignore */
  }
}

/**
 * Learner view: one task at a time, autosaved, with "Check my answers" for
 * tasks the system can mark, then a review-and-submit step.
 */
export default function HomeworkPlayer({ homework: initial, locale = "en", onChange }) {
  const c = homeworkCopy(locale);
  const { toast, confirmModal } = useToast();
  const [hw, setHw] = useState(initial);
  const editable = hw.status === "ASSIGNED" || hw.status === "IN_PROGRESS";
  const tasks = hw.content?.tasks || [];

  // ── answers + autosave ────────────────────────────────────────────────
  const [answers, setAnswers] = useState(initial.answers || {});
  const answersRef = useRef(answers);
  const versionRef = useRef(initial.answersVersion || 0);
  const editSeq = useRef(0);
  const savedSeq = useRef(0);
  const timer = useRef(null);
  const saving = useRef(false);
  const [saveState, setSaveState] = useState({ kind: "idle", at: null });
  const [checks, setChecks] = useState({});

  const persist = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current) {
      timer.current = setTimeout(persist, 300);
      return;
    }
    if (editSeq.current === savedSeq.current) return;
    saving.current = true;
    const seq = editSeq.current;
    setSaveState({ kind: "saving", at: null });
    try {
      const res = await api.patch(`/homework/${hw.id}/answers`, {
        answers: answersRef.current,
        baseVersion: versionRef.current,
      });
      versionRef.current = res.data.answersVersion;
      savedSeq.current = seq;
      setHw((prev) => ({ ...prev, status: "IN_PROGRESS", completedTasks: res.data.completedTasks }));
      if (seq === editSeq.current) clearBackup(hw.id);
      else writeBackup(hw.id, { answers: answersRef.current, baseVersion: versionRef.current });
      setSaveState({ kind: "saved", at: new Date() });
    } catch (e) {
      const data = e?.response?.data;
      if (e?.response?.status === 409 && data?.conflict) {
        versionRef.current = data.answersVersion;
        answersRef.current = data.answers || {};
        setAnswers(data.answers || {});
        savedSeq.current = editSeq.current;
        clearBackup(hw.id);
        toast.error(c.conflict);
        setSaveState({ kind: "saved", at: new Date() });
      } else if (e?.response?.status === 403) {
        setSaveState({ kind: "readonly", at: null });
      } else if (e?.response?.status === 409) {
        setHw((prev) => ({ ...prev, status: data?.status || prev.status }));
        setSaveState({ kind: "idle", at: null });
      } else {
        setSaveState({ kind: navigator.onLine === false ? "local" : "error", at: null });
        timer.current = setTimeout(persist, RETRY_MS);
      }
    } finally {
      saving.current = false;
    }
  }, [hw.id, toast, c.conflict]);

  const update = useCallback(
    (taskId, key, value) => {
      setAnswers((prev) => {
        const task = { ...(prev[taskId] || {}) };
        if (value === "" || value === false || value == null) delete task[key];
        else task[key] = value;
        const next = { ...prev, [taskId]: task };
        if (!Object.keys(task).length) delete next[taskId];
        answersRef.current = next;
        return next;
      });
      editSeq.current += 1;
      writeBackup(hw.id, { answers: answersRef.current, baseVersion: versionRef.current });
      // An edited field loses its old right/wrong mark until checked again.
      setChecks((prev) => {
        const current = prev[taskId];
        if (!current?.fields || !(key in current.fields)) return prev;
        const fields = { ...current.fields };
        delete fields[key];
        return { ...prev, [taskId]: { ...current, fields } };
      });
      clearTimeout(timer.current);
      timer.current = setTimeout(persist, SAVE_DELAY_MS);
    },
    [hw.id, persist]
  );

  // Restore unsynced work saved on this device (e.g. the connection dropped).
  useEffect(() => {
    if (!editable) return;
    const backup = readBackup(hw.id);
    if (backup && backup.baseVersion === versionRef.current && JSON.stringify(backup.answers) !== JSON.stringify(answersRef.current)) {
      answersRef.current = backup.answers || {};
      setAnswers(backup.answers || {});
      editSeq.current += 1;
      timer.current = setTimeout(persist, 300);
    } else if (backup && backup.baseVersion !== versionRef.current) {
      clearBackup(hw.id);
    }
    return () => clearTimeout(timer.current);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save straight away when the tab is hidden; warn before leaving with unsaved edits.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") persist();
    };
    const onLeave = (event) => {
      if (editSeq.current !== savedSeq.current) {
        persist();
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const onOnline = () => persist();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("online", onOnline);
    };
  }, [persist]);

  // ── navigation ─────────────────────────────────────────────────────────
  const firstOpen = useMemo(() => {
    const i = tasks.findIndex((t) => !isTaskDone(t, initial.answers?.[t.id]));
    return i === -1 ? tasks.length : i;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [step, setStep] = useState(editable ? firstOpen : 0);
  const done = tasks.map((t) => isTaskDone(t, answers[t.id]));
  const doneCount = done.filter(Boolean).length;
  const go = (i) => {
    persist();
    setStep(i);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── checking ──────────────────────────────────────────────────────────
  const [checking, setChecking] = useState(false);
  async function checkTask(task) {
    setChecking(true);
    try {
      const res = await api.post(`/homework/${hw.id}/check`, {
        taskId: task.id,
        answers: { [task.id]: answers[task.id] || {} },
      });
      setChecks((prev) => ({ ...prev, [task.id]: res.data }));
    } catch (e) {
      toast.error(e?.response?.data?.error || c.loadError);
    } finally {
      setChecking(false);
    }
  }

  // ── submit ─────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  async function submit() {
    if (doneCount < tasks.length) {
      const ok = await confirmModal(c.submitAnyway);
      if (!ok) return;
    }
    setSubmitting(true);
    clearTimeout(timer.current);
    try {
      const res = await api.post(`/homework/${hw.id}/submit`, {
        answers: answersRef.current,
        baseVersion: versionRef.current,
      });
      clearBackup(hw.id);
      savedSeq.current = editSeq.current;
      setHw(res.data.homework);
      setAnswers(res.data.homework.answers || {});
      setStep(0);
      onChange?.(res.data.homework);
      toast.success(c.submittedBanner);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const data = e?.response?.data;
      if (data?.conflict) {
        versionRef.current = data.answersVersion;
        answersRef.current = data.answers || {};
        setAnswers(data.answers || {});
        toast.error(c.conflict);
      } else {
        toast.error(data?.error || c.saveError);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────
  const onSummary = editable && step >= tasks.length;
  const task = tasks[Math.min(step, tasks.length - 1)];
  const comments = hw.teacherComments || {};
  const submittedMarks = hw.marks?.fields || {};

  return (
    <div className="hw-player">
      <header className="hw-head">
        <div className="hw-head__top">
          <span className="hw-level">{hw.level}</span>
          <HomeworkStatusPill status={hw.status} overdue={isOverdue(hw)} locale={locale} />
          {editable && <SaveIndicator state={saveState} c={c} locale={locale} />}
        </div>
        <h1 className="hw-title">{hw.title}</h1>
        <p className="hw-sub">
          {hw.teacher?.name && <span>{c.from(hw.teacher.name)}</span>}
          {hw.dueAt && <span>{c.due}: {formatDue(hw.dueAt, locale)}</span>}
        </p>
        <div className="hw-head__progress">
          <ProgressBar done={editable ? doneCount : hw.completedTasks} total={tasks.length} />
          <span>{c.tasksDone(editable ? doneCount : hw.completedTasks, tasks.length)}</span>
        </div>
        {hw.note && (
          <div className="hw-note">
            <strong>{c.teacherNote}</strong>
            <p dir="auto">{hw.note}</p>
          </div>
        )}
      </header>

      {hw.status === "SUBMITTED" && <p className="hw-banner hw-banner--info">{c.submittedBanner}</p>}
      {hw.status === "REVIEWED" && (
        <div className="hw-banner hw-banner--ok">
          <strong>{c.reviewedBanner}</strong>
          {comments.overall && <p className="hw-banner__comment" dir="auto">“{comments.overall}”</p>}
        </div>
      )}
      {saveState.kind === "readonly" && <p className="hw-banner hw-banner--warn">{c.readOnlyView}</p>}

      <details className="hw-vocab">
        <summary><BookOpen size={16} aria-hidden /> {c.expressions}</summary>
        <ul dir="ltr" lang="en">
          {(hw.content?.vocab || []).map((v) => (
            <li key={v.term}><strong>{v.term}</strong><span>{v.example}</span></li>
          ))}
        </ul>
      </details>

      {editable && (
        <nav className="hw-steps" aria-label="Tasks">
          {tasks.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className={`hw-step${i === step ? " is-current" : ""}${done[i] ? " is-done" : ""}`}
              onClick={() => go(i)}
              aria-current={i === step ? "step" : undefined}
            >
              {done[i] ? <Check size={14} aria-hidden /> : i + 1}
              <span className="hw-step__label">{t.title}</span>
            </button>
          ))}
          <button type="button" className={`hw-step hw-step--submit${onSummary ? " is-current" : ""}`} onClick={() => go(tasks.length)}>
            <Send size={14} aria-hidden />
            <span className="hw-step__label">{c.reviewSubmit}</span>
          </button>
        </nav>
      )}

      {editable && !onSummary && task && (
        <TaskCard task={task} index={step} total={tasks.length} c={c}>
          <HomeworkTask
            task={task}
            value={answers[task.id] || {}}
            onChange={(key, value) => update(task.id, key, value)}
            marks={checks[task.id]?.fields}
            locale={locale}
          />
          {task.checkable && (
            <div className="hw-checkbar">
              <button type="button" className="hw-btn hw-btn--soft" onClick={() => checkTask(task)} disabled={checking}>
                {checking ? <Loader2 size={16} className="hw-spin" aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}
                {checking ? c.checking : c.check}
              </button>
              {checks[task.id] && (
                <span className={`hw-checkbar__result${checks[task.id].correct === checks[task.id].total ? " is-all" : ""}`} role="status">
                  {checks[task.id].correct === checks[task.id].total
                    ? c.checkAllRight
                    : `${c.checkResult(checks[task.id].correct, checks[task.id].total)}. ${c.checkHint}`}
                </span>
              )}
            </div>
          )}
          <div className="hw-nav">
            <button type="button" className="hw-btn hw-btn--ghost" onClick={() => go(step - 1)} disabled={step === 0}>
              <ArrowLeft size={16} aria-hidden className="hw-flip" /> {c.prev}
            </button>
            <button type="button" className="hw-btn hw-btn--primary" onClick={() => go(step + 1)}>
              {step === tasks.length - 1 ? c.reviewSubmit : c.next} <ArrowRight size={16} aria-hidden className="hw-flip" />
            </button>
          </div>
        </TaskCard>
      )}

      {onSummary && (
        <section className="hw-card hw-summary">
          <h2>{c.summaryTitle}</h2>
          <p className="hw-muted">{c.summaryBody}</p>
          <ul className="hw-summary__list">
            {tasks.map((t, i) => (
              <li key={t.id}>
                <button type="button" onClick={() => go(i)}>
                  <span className={`hw-summary__dot${done[i] ? " is-done" : ""}`}>{done[i] ? <Check size={13} /> : i + 1}</span>
                  <span>{t.title}</span>
                  <span className={done[i] ? "hw-ok" : "hw-warn"}>{done[i] ? c.done : c.notDone}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="hw-nav">
            <button type="button" className="hw-btn hw-btn--ghost" onClick={() => go(tasks.length - 1)}>
              <ArrowLeft size={16} aria-hidden className="hw-flip" /> {c.prev}
            </button>
            <button type="button" className="hw-btn hw-btn--primary" onClick={submit} disabled={submitting || saveState.kind === "readonly"}>
              <Send size={16} aria-hidden /> {submitting ? c.submitting : c.submit}
            </button>
          </div>
        </section>
      )}

      {!editable &&
        tasks.map((t, i) => (
          <TaskCard key={t.id} task={t} index={i} total={tasks.length} c={c}>
            <HomeworkTask task={t} value={answers[t.id] || {}} readOnly marks={submittedMarks[t.id]} locale={locale} />
            {comments[t.id] && (
              <div className="hw-comment">
                <strong>{c.teacherComment}</strong>
                <p dir="auto">{comments[t.id]}</p>
              </div>
            )}
          </TaskCard>
        ))}
    </div>
  );
}

export function TaskCard({ task, index, total, c, children, aside }) {
  return (
    <section className="hw-card" aria-labelledby={`hw-task-${task.id}`}>
      <header className="hw-card__head">
        <span className="hw-card__kicker">
          <bdi>{c.task(index + 1, total)}</bdi> · <bdi>{task.skill}</bdi> · <bdi>{c.minutes(task.minutes)}</bdi>
        </span>
        <h2 id={`hw-task-${task.id}`} dir="ltr" lang="en">{task.title}</h2>
        {task.instructions && <p className="hw-card__instr" dir="ltr" lang="en">{task.instructions}</p>}
        {aside}
      </header>
      {children}
    </section>
  );
}

function SaveIndicator({ state, c, locale }) {
  if (state.kind === "saving") return <span className="hw-save"><Loader2 size={14} className="hw-spin" aria-hidden /> {c.saving}</span>;
  if (state.kind === "saved")
    return (
      <span className="hw-save hw-save--ok">
        <Check size={14} aria-hidden /> {c.saved}
        {state.at && ` · ${state.at.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit" })}`}
      </span>
    );
  if (state.kind === "local") return <span className="hw-save hw-save--warn"><CloudOff size={14} aria-hidden /> {c.savedLocal}</span>;
  if (state.kind === "error") return <span className="hw-save hw-save--warn"><CloudOff size={14} aria-hidden /> {c.saveError}</span>;
  return null;
}
