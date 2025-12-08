// app/resources/prep/PrepNotes.jsx
"use client";

import { useEffect, useState } from "react";
import { getDictionary, t } from "@/app/i18n";

export default function PrepNotes({ resourceId, locale = "en" }) {
  const [value, setValue] = useState("");

  const dict = getDictionary(locale, "resources");
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
  }, [resourceId, storageKey]);

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
        <span className="prep-notes__label">
          {t(dict, "resources_prep_notes_label")}
        </span>
        <span className="prep-notes__hint">
          {t(dict, "resources_prep_notes_hint")}
        </span>
      </div>

      <textarea
        className="prep-notes__textarea"
        placeholder={t(dict, "resources_prep_notes_placeholder")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
