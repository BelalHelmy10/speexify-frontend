"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";

const TARGET_MIN = 150; // soft target
const TARGET_MAX = 250; // soft target
const HARD_MIN = 120; // warn strongly if below
const HARD_MAX = 600; // warn strongly if above

function countWords(s) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export default function AssessmentPage() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [last, setLast] = useState(null);
  const [loadedFromServer, setLoadedFromServer] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  const draftKey = "assessmentDraft_v1";
  const autosaveTimer = useRef(null);
  const unsavedRef = useRef(false);

  // Load prior server submission or local draft
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me/assessment");
        if (data?.text) {
          setLast(data);
          setText(data.text);
          setWordCount(countWords(data.text));
          setLoadedFromServer(true);
          return;
        }
      } catch {}
      const local =
        typeof window !== "undefined"
          ? window.localStorage.getItem(draftKey)
          : null;
      if (local) {
        setText(local);
        setWordCount(countWords(local));
      }
    })();
  }, []);

  // Track unsaved changes for navigation warning
  useEffect(() => {
    const hasUnsaved = text.length > 0 && (!last || text !== last.text);
    unsavedRef.current = hasUnsaved;

    const beforeUnload = (e) => {
      if (unsavedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [text, last]);

  // Word count + debounced local autosave
  useEffect(() => {
    setWordCount(countWords(text));
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, text || "");
      } catch {}
    }, 500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [text]);

  const submit = async (e) => {
    e.preventDefault();

    if (wordCount < HARD_MIN) {
      const ok = confirm(
        `Your submission is only ${wordCount} words (minimum recommended is ${TARGET_MIN}). Submit anyway?`
      );
      if (!ok) return;
    } else if (wordCount < TARGET_MIN || wordCount > TARGET_MAX) {
      const ok = confirm(
        `Your response is ${wordCount} words. The target range is ${TARGET_MIN}–${TARGET_MAX} words. Submit anyway?`
      );
      if (!ok) return;
    } else if (wordCount > HARD_MAX) {
      const ok = confirm(
        `Your submission is ${wordCount} words, which is quite long. Are you sure you want to submit?`
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      await api.post("/me/assessment", { text });
      try {
        window.localStorage.removeItem(draftKey);
      } catch {}
      alert("Assessment submitted. We’ll review it soon.");
      setLast({ text, createdAt: new Date().toISOString() });
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  const clearDraft = () => {
    const ok = confirm("Clear your current draft? This cannot be undone.");
    if (!ok) return;
    setText("");
    setWordCount(0);
    try {
      window.localStorage.removeItem(draftKey);
    } catch {}
  };

  return (
    <div
      className="assessment-container"
      role="main"
      aria-labelledby="assessment-title"
    >
      <h2 id="assessment-title" className="assessment-title">
        Written assessment
      </h2>

      <p className="assessment-intro">
        Please write{" "}
        <strong>
          ~{TARGET_MIN}–{TARGET_MAX} words
        </strong>{" "}
        on the prompt below. We’ll use this to gauge your grammar, vocabulary,
        and organization. You can save your work locally—don’t worry if you need
        to pause.
      </p>

      <div className="assessment-panel" data-panel="prompt">
        <h4 className="assessment-panel__title">Prompt</h4>
        <p className="assessment-panel__body">
          <em>
            Describe a situation where improving your English would have changed
            the outcome. What happened, and what would you like to do
            differently next time?
          </em>
        </p>
        <p className="assessment-tip">
          <strong>Tip:</strong> Aim for a clear structure (intro → what happened
          → what you would change → brief conclusion).
        </p>
      </div>

      <form
        onSubmit={submit}
        className="assessment-form-grid"
        aria-describedby="assessment-wordcount"
      >
        <label htmlFor="assessment-response" className="assessment-label">
          <span className="assessment-label__text">Your response</span>
          <textarea
            id="assessment-response"
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write here..."
            className="assessment-textarea"
          />
        </label>

        <div id="assessment-wordcount" className="assessment-wordcount">
          <strong>Word count:</strong> {wordCount} (target {TARGET_MIN}–
          {TARGET_MAX})
          {last && (
            <>
              {" "}
              ·{" "}
              <span className="assessment-lastsubmit">
                Last submitted: {new Date(last.createdAt).toLocaleString()}
              </span>
            </>
          )}
          {!loadedFromServer && (
            <>
              {" "}
              ·{" "}
              <span className="assessment-draftnote">
                Draft auto-saved locally
              </span>
            </>
          )}
        </div>

        {/* Separated buttons (no shared row class) */}
        <div className="assessment-actions">
          <div className="assessment-action">
            <button
              className="assessment-btn assessment-btn--primary"
              disabled={saving}
              aria-label="Submit assessment"
            >
              {saving ? "Submitting..." : "Submit"}
            </button>
          </div>

          <div className="assessment-action">
            <button
              type="button"
              onClick={clearDraft}
              className="assessment-btn"
              aria-label="Clear draft"
            >
              Clear draft
            </button>
          </div>

          <div className="assessment-action">
            <Link
              href="/dashboard"
              className="assessment-btn assessment-btn--ghost"
              aria-label="Back to dashboard"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
