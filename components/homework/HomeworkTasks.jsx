"use client";

import { useRef } from "react";
import { Check, X } from "lucide-react";
import { homeworkCopy, wordCount } from "./homeworkCopy";

/**
 * One homework task. Used by the learner (editable) and the teacher (read-only
 * with answer keys). `marks` maps field keys to true/false after checking.
 */

/** Required field keys for a task, mirroring the server's progress rules. */
export function requiredKeys(task) {
  switch (task.type) {
    case "match":
    case "rewrite":
      return task.items.map((i) => i.id);
    case "gaps":
      return task.items.flatMap((i) =>
        Array.from({ length: i.gapCount ?? i.answers?.length ?? 0 }, (_, g) => `${i.id}.${g}`)
      );
    case "writing":
      return task.parts?.length ? task.parts.map((p) => p.id) : ["text"];
    case "checklist":
      return (task.steps || []).map((_, i) => `step.${i}`);
    default:
      return [];
  }
}

export function isTaskDone(task, value = {}) {
  const keys = requiredKeys(task);
  return keys.length > 0 && keys.every((k) => (typeof value[k] === "boolean" ? value[k] : String(value[k] || "").trim()));
}

function Mark({ ok }) {
  if (ok === undefined) return null;
  return ok ? (
    <span className="hw-mark hw-mark--ok" aria-label="Correct"><Check size={15} /></span>
  ) : (
    <span className="hw-mark hw-mark--no" aria-label="Incorrect"><X size={15} /></span>
  );
}

const markClass = (ok) => (ok === true ? " is-right" : ok === false ? " is-wrong" : "");

function KeyLine({ show, label, values }) {
  if (!show || !values?.length) return null;
  return (
    <span className="hw-key">
      {label}: <strong>{values.join(" / ")}</strong>
    </span>
  );
}

function MatchTask({ task, value, onChange, readOnly, marks, showKey, c }) {
  const label = (key) => {
    const o = task.options.find((opt) => opt.key === key);
    return o ? `${o.key}) ${o.label}` : "";
  };
  return (
    <ol className="hw-items">
      {task.items.map((item, i) => (
        <li key={item.id} className="hw-item hw-item--match">
          <span className="hw-item__num">{i + 1}</span>
          <span className="hw-item__prompt">{item.prompt}</span>
          <span className="hw-item__answer">
            {readOnly ? (
              <span className={`hw-readonly${markClass(marks?.[item.id])}`}>{label(value[item.id]) || c.noAnswer}</span>
            ) : (
              <select
                id={`${task.id}-${item.id}`}
                className={`hw-select${markClass(marks?.[item.id])}`}
                value={value[item.id] || ""}
                onChange={(e) => onChange(item.id, e.target.value)}
              >
                <option value="">{c.chooseAnswer}</option>
                {task.options.map((o) => (
                  <option key={o.key} value={o.key}>{o.key}) {o.label}</option>
                ))}
              </select>
            )}
            <Mark ok={marks?.[item.id]} />
            {marks?.[item.id] === false && <KeyLine show={showKey} label={c.correctAnswer} values={(item.answer || []).map(label)} />}
          </span>
        </li>
      ))}
    </ol>
  );
}

function GapsTask({ task, value, onChange, readOnly, marks, showKey, c }) {
  const lastFocused = useRef(null);
  const fillFromBank = (word) => {
    const keys = task.items.flatMap((item) =>
      Array.from({ length: item.gapCount ?? item.answers?.length ?? 0 }, (_, g) => `${item.id}.${g}`)
    );
    const target =
      (lastFocused.current && !String(value[lastFocused.current] || "").trim() && lastFocused.current) ||
      keys.find((k) => !String(value[k] || "").trim());
    if (target) {
      onChange(target, word);
      lastFocused.current = null;
    }
  };
  return (
    <>
      {task.bank?.length > 0 && (
        <div className="hw-bank">
          {!readOnly && <span className="hw-bank__hint">{c.wordBankHint}</span>}
          <div className="hw-bank__words">
            {task.bank.map((word) =>
              readOnly ? (
                <span key={word} className="hw-bank__word">{word}</span>
              ) : (
                <button key={word} type="button" className="hw-bank__word" onClick={() => fillFromBank(word)}>
                  {word}
                </button>
              )
            )}
          </div>
        </div>
      )}
      <ol className="hw-items">
        {task.items.map((item, i) => {
          const parts = item.text.split("___");
          return (
            <li key={item.id} className="hw-item">
              <span className="hw-item__num">{i + 1}</span>
              <span className="hw-item__body">
                {item.lead && <span className="hw-item__lead">{item.lead}</span>}
                <span className="hw-gapline">
                  {parts.map((part, g) => {
                    const key = `${item.id}.${g}`;
                    const isGap = g < parts.length - 1;
                    return (
                      <span key={key}>
                        {part}
                        {isGap &&
                          (readOnly ? (
                            <span className={`hw-gap-ro${markClass(marks?.[key])}`}>
                              {value[key] || "…"}
                              <Mark ok={marks?.[key]} />
                              {marks?.[key] === false && <KeyLine show={showKey} label={c.correctAnswer} values={item.answers?.[g]} />}
                            </span>
                          ) : (
                            <span className="hw-gap-wrap">
                              <input
                                id={`${task.id}-${key}`}
                                className={`hw-gap${markClass(marks?.[key])}`}
                                value={value[key] || ""}
                                onFocus={() => (lastFocused.current = key)}
                                onChange={(e) => onChange(key, e.target.value)}
                                autoComplete="off"
                                autoCapitalize="off"
                                spellCheck={false}
                                aria-label={`Gap ${g + 1} in sentence ${i + 1}`}
                                style={{ width: `${Math.max(7, String(value[key] || "").length + 2)}ch` }}
                              />
                              <Mark ok={marks?.[key]} />
                            </span>
                          ))}
                      </span>
                    );
                  })}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function RewriteTask({ task, value, onChange, readOnly, marks, showKey, c }) {
  const rows = (task.lines || 1) + 1;
  return (
    <>
      <ol className="hw-items">
        {task.items.map((item, i) => (
          <li key={item.id} className="hw-item hw-item--stack">
            <span className="hw-item__num">{i + 1}</span>
            <span className="hw-item__body">
              <span className="hw-item__prompt">{item.prompt}</span>
              {readOnly ? (
                <span className={`hw-readonly hw-readonly--block${markClass(marks?.[item.id])}`}>
                  {value[item.id] || c.noAnswer}
                  <Mark ok={marks?.[item.id]} />
                </span>
              ) : (
                <span className="hw-field-row">
                  <textarea
                    id={`${task.id}-${item.id}`}
                    className={`hw-textarea${markClass(marks?.[item.id])}`}
                    rows={rows}
                    placeholder={task.placeholder || ""}
                    value={value[item.id] || ""}
                    onChange={(e) => onChange(item.id, e.target.value)}
                  />
                  <Mark ok={marks?.[item.id]} />
                </span>
              )}
              {marks?.[item.id] === false && <KeyLine show={showKey} label={c.correctAnswer} values={item.answer} />}
            </span>
          </li>
        ))}
      </ol>
      {showKey && task.models?.length > 0 && (
        <div className="hw-models">
          <strong>{c.modelAnswers}</strong>
          <ol>{task.models.map((m) => <li key={m}>{m}</li>)}</ol>
        </div>
      )}
    </>
  );
}

function Checks({ task, value, onChange, readOnly, prefix, items, title }) {
  if (!items?.length) return null;
  return (
    <div className="hw-checklist">
      {title && <strong className="hw-checklist__title">{title}</strong>}
      {items.map((label, i) => {
        const key = `${prefix}.${i}`;
        return (
          <label key={key} className={`hw-tick${value[key] ? " is-on" : ""}`}>
            <input
              id={`${task.id}-${key}`}
              type="checkbox"
              checked={Boolean(value[key])}
              disabled={readOnly}
              onChange={(e) => onChange(key, e.target.checked)}
            />
            <span>{label}</span>
          </label>
        );
      })}
    </div>
  );
}

function WritingTask({ task, value, onChange, readOnly, c }) {
  const parts = task.parts?.length ? task.parts : [{ id: "text", label: "", hint: "" }];
  const total = parts.reduce((sum, p) => sum + wordCount(value[p.id]), 0);
  const { minWords: min, maxWords: max } = task;
  const tone = min && total < min ? "low" : max && total > max ? "high" : total ? "ok" : "";
  return (
    <>
      <div className="hw-parts">
        {parts.map((p) => (
          <label key={p.id} className="hw-part">
            {p.label && <span className="hw-part__label">{p.label}</span>}
            {readOnly ? (
              <span className="hw-readonly hw-readonly--block">{value[p.id] || c.noAnswer}</span>
            ) : (
              <textarea
                id={`${task.id}-${p.id}`}
                className="hw-textarea"
                rows={parts.length > 3 ? 3 : 4}
                placeholder={p.hint}
                value={value[p.id] || ""}
                onChange={(e) => onChange(p.id, e.target.value)}
              />
            )}
          </label>
        ))}
      </div>
      <p className={`hw-words hw-words--${tone}`}>
        {c.words(total)}
        {(min || max) && <span> · {c.wordTarget(min, max)}</span>}
      </p>
      <Checks task={task} value={value} onChange={onChange} readOnly={readOnly} prefix="check" items={task.checklist} title={c.selfCheck} />
    </>
  );
}

function ChecklistTask({ task, value, onChange, readOnly, c }) {
  return (
    <>
      <Checks task={task} value={value} onChange={onChange} readOnly={readOnly} prefix="step" items={task.steps} />
      <Checks task={task} value={value} onChange={onChange} readOnly={readOnly} prefix="check" items={task.checklist} title={c.selfCheck} />
      {task.reflection && (
        <label className="hw-part">
          <span className="hw-part__label">{task.reflection}</span>
          {readOnly ? (
            <span className="hw-readonly hw-readonly--block">{value.reflection || c.noAnswer}</span>
          ) : (
            <textarea
              id={`${task.id}-reflection`}
              className="hw-textarea"
              rows={3}
              placeholder={c.reflection}
              value={value.reflection || ""}
              onChange={(e) => onChange("reflection", e.target.value)}
            />
          )}
        </label>
      )}
    </>
  );
}

const RENDERERS = { match: MatchTask, gaps: GapsTask, rewrite: RewriteTask, writing: WritingTask, checklist: ChecklistTask };

export default function HomeworkTask({ task, value = {}, onChange, readOnly = false, marks, showKey = false, locale = "en" }) {
  const c = homeworkCopy(locale);
  const Renderer = RENDERERS[task.type];
  if (!Renderer) return null;
  return (
    <div className="hw-task" dir="ltr" lang="en">
      <Renderer task={task} value={value} onChange={onChange} readOnly={readOnly} marks={marks} showKey={showKey} c={c} />
    </div>
  );
}
