// app/resources/prep/PrepNotes.jsx
"use client";

import { useEffect, useState } from "react";

export default function PrepNotes({ resourceId }) {
  const [value, setValue] = useState("");

  const storageKey = `speexify_prep_notes_${resourceId}`;

  // Load notes from localStorage
  useEffect(() => {
    if (!resourceId) return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved != null) {
        setValue(saved);
      }
    } catch (err) {
      console.warn("Failed to read prep notes from localStorage", err);
    }
  }, [resourceId]);

  // Save notes to localStorage
  useEffect(() => {
    if (!resourceId) return;
    try {
      window.localStorage.setItem(storageKey, value);
    } catch (err) {
      console.warn("Failed to save prep notes to localStorage", err);
    }
  }, [value, resourceId, storageKey]);

  return (
    <div className="prep-notes">
      <div className="prep-notes__header">
        <span className="prep-notes__label">Session notes</span>
        <span className="prep-notes__hint">
          Jot down warm-ups, questions, pronunciation points, follow-ups, etc.
        </span>
      </div>

      <textarea
        className="prep-notes__textarea"
        placeholder="Start writing your plan for this resource..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
