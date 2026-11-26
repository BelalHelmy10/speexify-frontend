"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Send, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { formatDue, homeworkCopy, isOverdue, toLocalInputValue } from "./homeworkCopy";
import { HomeworkStatusPill, ProgressBar } from "./HomeworkBits";
import "@/styles/homework.scss";

/**
 * Homework block on the session page.
 * Teachers (and admins) assign homework here; learners see what was assigned.
 */
export default function HomeworkSessionPanel({ sessionId, locale = "en", prefix = "", canTeach }) {
  const c = homeworkCopy(locale);
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [learnerIds, setLearnerIds] = useState([]);
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/sessions/${sessionId}/homework`);
      setData(res.data);
      setError("");
      if (res.data.templates) {
        setTemplateId((prev) => prev || res.data.suggestedTemplateId || res.data.templates[0]?.id || "");
        setLearnerIds((prev) => (prev.length ? prev : (res.data.learners || []).map((l) => l.id)));
        setDueAt((prev) => prev || toLocalInputValue(res.data.defaultDueAt));
      }
    } catch (e) {
      setError(e?.response?.data?.error || c.loadError);
    }
  }, [sessionId, c.loadError]);

  useEffect(() => {
    if (sessionId) load();
  }, [sessionId, load]);

  const templates = data?.templates || [];
  const selected = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);
  const assignments = data?.assignments || [];
  const learners = data?.learners || [];

  async function assign(event) {
    event.preventDefault();
    if (!templateId || !learnerIds.length || busy) return;
    setBusy(true);
    try {
      const res = await api.post(`/sessions/${sessionId}/homework`, {
        templateId,
        learnerIds,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        note: note.trim(),
      });
      const created = res.data?.created?.length || 0;
      if (created) {
        toast.success(c.assignedToast(created));
        setNote("");
      } else {
        toast.error(c.alreadyAssigned);
      }
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.error || c.loadError);
    } finally {
      setBusy(false);
    }
  }

  // Learners only see the panel when there is homework for them.
  if (!canTeach && !assignments.length) return null;

  return (
    <section className="sd-panel hw-session" aria-labelledby="hw-session-title">
      <header className="sd-panel__head">
        <span className="sd-panel__icon" aria-hidden>
          <ClipboardList size={18} strokeWidth={2} />
        </span>
        <div className="sd-panel__titles">
          <h2 className="sd-panel__title" id="hw-session-title">{c.assignTitle}</h2>
          <p className="sd-panel__hint">{canTeach ? c.assignHint : c.learnerPanelHint}</p>
        </div>
      </header>

      {error && <p className="hw-error" role="alert">{error}</p>}

      {canTeach && data && !data.canAssign && <p className="hw-muted">{c.cantAssignYet}</p>}

      {canTeach && data?.canAssign && (
        <form className="hw-assign" onSubmit={assign}>
          <label className="hw-field">
            <span className="hw-field__label">{c.pick}</span>
            <select id="hw-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.level} · {t.title}
                  {t.id === data.suggestedTemplateId ? ` (${c.suggested})` : ""}
                </option>
              ))}
            </select>
            {selected && (
              <span className="hw-field__meta">
                {selected.id === data.suggestedTemplateId && (
                  <span className="hw-chip hw-chip--teal"><Sparkles size={13} aria-hidden /> {c.suggested}</span>
                )}
                <span>{selected.topic} · {c.taskCount(selected.taskCount)} · {c.minutes(selected.minutes)}</span>
              </span>
            )}
          </label>

          {learners.length > 1 && (
            <fieldset className="hw-field">
              <legend className="hw-field__label">{c.learners}</legend>
              <div className="hw-checks">
                {learners.map((l) => (
                  <label key={l.id} className="hw-check">
                    <input
                      type="checkbox"
                      checked={learnerIds.includes(l.id)}
                      onChange={(e) =>
                        setLearnerIds((prev) => (e.target.checked ? [...prev, l.id] : prev.filter((id) => id !== l.id)))
                      }
                    />
                    {l.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <label className="hw-field">
            <span className="hw-field__label">{c.dueDate}</span>
            <input id="hw-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            {data.nextSessionAt && <span className="hw-field__meta">{c.nextSessionHint(formatDue(data.nextSessionAt, locale))}</span>}
          </label>

          <label className="hw-field hw-field--wide">
            <span className="hw-field__label">{c.note}</span>
            <textarea id="hw-note" rows={2} maxLength={1000} value={note} placeholder={c.notePlaceholder} onChange={(e) => setNote(e.target.value)} />
          </label>

          <div className="hw-assign__actions">
            <button type="submit" className="hw-btn hw-btn--primary" disabled={busy || !templateId || !learnerIds.length}>
              <Send size={16} aria-hidden /> {busy ? c.assigning : c.assign}
            </button>
          </div>
        </form>
      )}

      {assignments.length > 0 && (
        <div className="hw-session__list">
          {canTeach && <h3 className="hw-subhead">{c.sessionHomework}</h3>}
          {assignments.map((a) => (
            <Link key={a.id} href={`${prefix}/dashboard/homework/${a.id}`} className="hw-row">
              <span className="hw-row__main">
                <strong>{a.title}</strong>
                <span className="hw-row__meta">
                  {canTeach && a.learner ? `${a.learner.name} · ` : ""}
                  {a.dueAt ? `${isOverdue(a) ? c.overdue : c.due}: ${formatDue(a.dueAt, locale)}` : c.noDue}
                </span>
              </span>
              <span className="hw-row__progress">
                <ProgressBar done={a.completedTasks} total={a.taskCount} />
                <span className="hw-row__count">{c.tasksDone(a.completedTasks, a.taskCount)}</span>
              </span>
              <HomeworkStatusPill status={a.status} overdue={isOverdue(a)} locale={locale} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
