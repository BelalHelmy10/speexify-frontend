"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, Asterisk, ChevronDown, Mic, Plus, Sparkles, StickyNote, Trash2 } from "lucide-react";
import {
  getMistakeSegments,
  hasUnpairedMark,
  stripMarks,
  toggleMarkAroundSelection,
} from "@/lib/feedbackMarks.mjs";
import { FEEDBACK_TYPES, MarkedText, getFeedbackType } from "./feedbackShared";

let rowSequence = 0;

export function createFeedbackRow(type = "vocabulary", values = {}) {
  rowSequence += 1;
  return {
    id: `${type}-${Date.now().toString(36)}-${rowSequence}`,
    type,
    prompt: "",
    response: "",
    createdAt: new Date().toISOString(),
    ...values,
  };
}

function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

// Grows a textarea to fit its text so long sentences stay readable.
function fitHeight(element) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function MistakePreview({ row }) {
  const segments = getMistakeSegments(row.prompt, row.response);
  const unpaired = hasUnpairedMark(row.prompt) || hasUnpairedMark(row.response);
  if (!row.prompt.trim() && !row.response.trim()) return null;

  return (
    <div className="fb-row-preview" aria-live="polite">
      <span className="fb-row-preview__label">Learner sees</span>
      <span className="fb-row-preview__pair">
        <MarkedText segments={segments.before} tone="wrong" />
        <span className="fb-row-preview__arrow" aria-hidden="true">→</span>
        <MarkedText segments={segments.after} tone="right" />
      </span>
      {segments.source === "auto" && (
        <span className="fb-row-preview__hint">
          <Sparkles size={12} aria-hidden="true" /> Changes found for you
        </span>
      )}
      {unpaired && (
        <span className="fb-row-preview__warn" role="status">
          <AlertTriangle size={12} aria-hidden="true" /> One * is missing its partner
        </span>
      )}
    </div>
  );
}

export default function FeedbackReportEditor({ items, onChangeItems, canEdit }) {
  const fieldRefs = useRef(new Map());
  const lastFieldRef = useRef(null);
  const [pendingFocus, setPendingFocus] = useState(null);
  const [openNotes, setOpenNotes] = useState(() => new Set());
  const shortcut = isMac() ? "⌘B" : "Ctrl+B";

  const setFieldRef = (rowId, field) => (element) => {
    const key = `${rowId}:${field}`;
    if (element) {
      fieldRefs.current.set(key, element);
      fitHeight(element);
    } else {
      fieldRefs.current.delete(key);
    }
  };

  useLayoutEffect(() => {
    if (!pendingFocus) return;
    const element = fieldRefs.current.get(pendingFocus.key);
    if (element) {
      element.focus();
      if (pendingFocus.selection) {
        element.setSelectionRange(pendingFocus.selection.start, pendingFocus.selection.end);
      }
      fitHeight(element);
    }
    setPendingFocus(null);
  }, [pendingFocus, items]);

  useEffect(() => {
    fieldRefs.current.forEach((element) => fitHeight(element));
  }, []);

  const updateRow = (rowId, patch) => {
    onChangeItems((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const addRow = (afterRowId, type) => {
    const anchor = items.find((row) => row.id === afterRowId) || items.at(-1);
    const newRow = createFeedbackRow(type || anchor?.type || "vocabulary");
    onChangeItems((current) => {
      const index = current.findIndex((row) => row.id === afterRowId);
      const next = [...current];
      next.splice(index === -1 ? current.length : index + 1, 0, newRow);
      return next;
    });
    setPendingFocus({ key: `${newRow.id}:prompt` });
  };

  const removeRow = (rowId) => {
    const index = items.findIndex((row) => row.id === rowId);
    const neighbour = items[index - 1] || items[index + 1];
    onChangeItems((current) => current.filter((row) => row.id !== rowId));
    if (neighbour) setPendingFocus({ key: `${neighbour.id}:prompt` });
  };

  const toggleNote = (rowId) => {
    const row = items.find((item) => item.id === rowId);
    const isOpen = openNotes.has(rowId) || Boolean(row?.note);
    setOpenNotes((current) => {
      const next = new Set(current);
      if (isOpen) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
    if (isOpen) {
      if (row?.note) updateRow(rowId, { note: "" });
    } else {
      setPendingFocus({ key: `${rowId}:note` });
    }
  };

  const toggleMark = (rowId, field) => {
    const element = fieldRefs.current.get(`${rowId}:${field}`);
    const row = items.find((item) => item.id === rowId);
    if (!element || !row) return;
    const result = toggleMarkAroundSelection(row[field], element.selectionStart, element.selectionEnd);
    updateRow(rowId, { [field]: result.value });
    setPendingFocus({ key: `${rowId}:${field}`, selection: { start: result.start, end: result.end } });
  };

  const handleKeyDown = (event, rowIndex, row, field) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      toggleMark(row.id, field);
      return;
    }
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (field === "prompt") {
      setPendingFocus({ key: `${row.id}:response` });
    } else if (rowIndex === items.length - 1) {
      addRow(row.id);
    } else {
      setPendingFocus({ key: `${items[rowIndex + 1].id}:prompt` });
    }
  };

  const vocabularyWithoutPronunciation = items.filter(
    (row) =>
      row.type === "vocabulary" &&
      row.prompt.trim() &&
      !items.some(
        (other) =>
          other.type === "pronunciation" &&
          stripMarks(other.prompt).trim().toLowerCase() === stripMarks(row.prompt).trim().toLowerCase()
      )
  );

  const addPronunciationRows = () => {
    onChangeItems((current) => [
      ...current.filter((row) => row.prompt.trim() || row.response.trim()),
      ...vocabularyWithoutPronunciation.map((row) =>
        createFeedbackRow("pronunciation", { prompt: stripMarks(row.prompt).trim() })
      ),
    ]);
  };

  return (
    <section className="fb-editor" aria-label="Session report entries">
      <div className="fb-editor__head">
        <div>
          <p className="session-report-kicker">Session report</p>
          <h2>Entries</h2>
        </div>
        <button
          type="button"
          className="fb-mark-button"
          disabled={!canEdit}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const last = lastFieldRef.current;
            if (last) toggleMark(last.rowId, last.field);
          }}
          title={`Mark the selected words (${shortcut})`}
        >
          <Asterisk size={15} aria-hidden="true" />
          Mark words
          <kbd>{shortcut}</kbd>
        </button>
      </div>

      <p className="fb-editor__tip">
        Wrap words in <code>*asterisks*</code> to mark them. On a <strong>Mistake</strong> row the learner
        sees them <span className="fb-mark fb-mark--wrong">in red</span> on the left and{" "}
        <span className="fb-mark fb-mark--right">in green</span> on the right. Press Enter to move to the
        next box.
      </p>

      <div className="fb-grid" role="table" aria-label="Feedback entries">
        <div className="fb-grid__head" role="row">
          <span role="columnheader" className="fb-grid__index">#</span>
          <span role="columnheader">Type</span>
          <span role="columnheader">Entry</span>
          <span role="columnheader">Comment</span>
          <span role="columnheader" className="fb-sr-only">Actions</span>
        </div>

        {items.length === 0 && (
          <div className="fb-grid__empty" role="row">
            <span role="cell">No entries yet. Add the first one below.</span>
          </div>
        )}

        {items.map((row, rowIndex) => {
          const config = getFeedbackType(row.type);
          const noteOpen = openNotes.has(row.id) || Boolean(row.note);
          return (
            <div key={row.id} className={`fb-grid__row fb-grid__row--${row.type}`} role="row">
              <span role="cell" className="fb-grid__index">{rowIndex + 1}</span>
              <span role="cell" className="fb-grid__type">
                <span className="fb-select">
                  <select
                    value={row.type}
                    disabled={!canEdit}
                    aria-label={`Type for entry ${rowIndex + 1}`}
                    onChange={(event) => updateRow(row.id, { type: event.target.value })}
                  >
                    {FEEDBACK_TYPES.map((type) => (
                      <option key={type.key} value={type.key}>{type.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} aria-hidden="true" />
                </span>
              </span>
              {["prompt", "response"].map((field) => (
                <span role="cell" key={field} className={`fb-grid__field fb-grid__field--${field}`}>
                  <span className="fb-grid__field-label">
                    {field === "prompt" ? config.entryLabel : config.commentLabel}
                  </span>
                  <textarea
                    ref={setFieldRef(row.id, field)}
                    rows={1}
                    dir="auto"
                    maxLength={500}
                    value={row[field]}
                    disabled={!canEdit}
                    aria-label={`${field === "prompt" ? config.entryLabel : config.commentLabel}, entry ${rowIndex + 1}`}
                    placeholder={field === "prompt" ? config.entryPlaceholder : config.commentPlaceholder}
                    onFocus={() => { lastFieldRef.current = { rowId: row.id, field }; }}
                    onChange={(event) => {
                      updateRow(row.id, { [field]: event.target.value.replace(/\n/g, " ") });
                      fitHeight(event.target);
                    }}
                    onKeyDown={(event) => handleKeyDown(event, rowIndex, row, field)}
                  />
                </span>
              ))}
              <span role="cell" className="fb-grid__actions">
                <button
                  type="button"
                  className={`session-report-icon-button ${noteOpen ? "is-active" : ""}`}
                  disabled={!canEdit}
                  onClick={() => toggleNote(row.id)}
                  aria-label={`${noteOpen ? "Remove" : "Add"} explanation for entry ${rowIndex + 1}`}
                  aria-pressed={noteOpen}
                  title={noteOpen ? "Remove the explanation" : "Add an explanation"}
                >
                  <StickyNote size={15} />
                </button>
                <button
                  type="button"
                  className="session-report-icon-button session-report-icon-button--danger"
                  disabled={!canEdit}
                  onClick={() => removeRow(row.id)}
                  aria-label={`Delete entry ${rowIndex + 1}`}
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </span>

              {(row.type === "grammar" || noteOpen) && (
                <div className="fb-grid__extra" role="cell">
                  {row.type === "grammar" && <MistakePreview row={row} />}
                  {noteOpen && (
                    <label className="fb-note">
                      <span>Why (optional)</span>
                      <textarea
                        ref={setFieldRef(row.id, "note")}
                        rows={1}
                        dir="auto"
                        maxLength={500}
                        value={row.note || ""}
                        disabled={!canEdit}
                        placeholder={
                          row.type === "grammar"
                            ? "“Agree” is already a verb, so we don't add “am”."
                            : "A short tip the learner sees under this entry."
                        }
                        onChange={(event) => {
                          updateRow(row.id, { note: event.target.value.replace(/\n/g, " ") });
                          fitHeight(event.target);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            if (rowIndex === items.length - 1) addRow(row.id);
                            else setPendingFocus({ key: `${items[rowIndex + 1].id}:prompt` });
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div className="fb-editor__foot">
          <button type="button" className="fb-add-row" onClick={() => addRow(items.at(-1)?.id)}>
            <Plus size={17} aria-hidden="true" />
            Add entry
          </button>
          {vocabularyWithoutPronunciation.length > 0 && (
            <button type="button" className="fb-helper-button" onClick={addPronunciationRows}>
              <Mic size={15} aria-hidden="true" />
              Add pronunciation for {vocabularyWithoutPronunciation.length === 1
                ? "the new word"
                : `the ${vocabularyWithoutPronunciation.length} new words`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
