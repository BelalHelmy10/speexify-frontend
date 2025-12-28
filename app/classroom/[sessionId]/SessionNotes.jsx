// app/classroom/[sessionId]/SessionNotes.jsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import api from "@/lib/api";

/**
 * SessionNotes - Teacher's notes panel for the live classroom
 *
 * Features:
 * - Auto-save with debounce
 * - Real-time sync indicator
 * - Expandable/collapsible
 * - Character count
 *
 * Props:
 * - sessionId: string | number
 * - isTeacher: boolean
 * - classroomChannel: { send, subscribe, ready } - for real-time sync
 * - initialNotes: string
 * - isOpen: boolean
 * - onToggle: () => void
 */
export default function SessionNotes({
  sessionId,
  isTeacher,
  classroomChannel,
  initialNotes = "",
  isOpen = true,
  onToggle,
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [saveStatus, setSaveStatus] = useState("saved"); // "saved" | "saving" | "unsaved" | "error"
  const [lastSaved, setLastSaved] = useState(null);
  const [isExpanded, setIsExpanded] = useState(isOpen);

  const saveTimeoutRef = useRef(null);
  const textareaRef = useRef(null);

  // Load initial notes from API
  useEffect(() => {
    if (!sessionId) return;

    async function loadNotes() {
      try {
        const { data } = await api.get(`/sessions/${sessionId}/notes`);
        if (data?.notes) {
          setNotes(data.notes);
          setLastSaved(new Date());
        }
      } catch (err) {
        console.warn("Failed to load session notes:", err);
      }
    }

    loadNotes();
  }, [sessionId]);

  // Auto-save with debounce
  const saveNotes = useCallback(
    async (content) => {
      if (!sessionId || !isTeacher) return;

      try {
        setSaveStatus("saving");
        await api.post(`/sessions/${sessionId}/notes`, { notes: content });
        setSaveStatus("saved");
        setLastSaved(new Date());

        // Broadcast notes update to other clients (learners can see read-only)
        if (classroomChannel?.ready && classroomChannel?.send) {
          classroomChannel.send({
            type: "SESSION_NOTES_UPDATE",
            notes: content,
            sessionId,
          });
        }
      } catch (err) {
        console.error("Failed to save notes:", err);
        setSaveStatus("error");
      }
    },
    [sessionId, isTeacher, classroomChannel]
  );

  // Handle notes change with auto-save
  const handleNotesChange = useCallback(
    (e) => {
      const newValue = e.target.value;
      setNotes(newValue);
      setSaveStatus("unsaved");

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for auto-save (2 seconds debounce)
      saveTimeoutRef.current = setTimeout(() => {
        saveNotes(newValue);
      }, 2000);
    },
    [saveNotes]
  );

  // Manual save (Ctrl+S or button)
  const handleManualSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveNotes(notes);
  }, [notes, saveNotes]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleManualSave();
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener("keydown", handleKeyDown);
      return () => textarea.removeEventListener("keydown", handleKeyDown);
    }
  }, [handleManualSave]);

  // Listen for notes updates from channel (for learners)
  useEffect(() => {
    if (!classroomChannel?.subscribe || isTeacher) return;

    const unsubscribe = classroomChannel.subscribe((msg) => {
      if (
        msg?.type === "SESSION_NOTES_UPDATE" &&
        String(msg.sessionId) === String(sessionId)
      ) {
        setNotes(msg.notes || "");
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [classroomChannel, sessionId, isTeacher]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Status indicator
  const getStatusIndicator = () => {
    switch (saveStatus) {
      case "saving":
        return { text: "Saving...", icon: "⏳", className: "saving" };
      case "unsaved":
        return { text: "Unsaved", icon: "●", className: "unsaved" };
      case "error":
        return { text: "Error saving", icon: "⚠", className: "error" };
      case "saved":
      default:
        return {
          text: lastSaved
            ? `Saved ${lastSaved.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "Saved",
          icon: "✓",
          className: "saved",
        };
    }
  };

  const status = getStatusIndicator();
  const characterCount = notes.length;
  const maxCharacters = 10000;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (typeof onToggle === "function") {
      onToggle();
    }
  };

  return (
    <div
      className={`session-notes ${
        isExpanded ? "session-notes--expanded" : "session-notes--collapsed"
      }`}
    >
      <div className="session-notes__header" onClick={handleToggle}>
        <div className="session-notes__title">
          <span className="session-notes__icon">📝</span>
          <span>Session Notes</span>
          {!isTeacher && (
            <span className="session-notes__readonly">(Read Only)</span>
          )}
        </div>
        <div className="session-notes__header-actions">
          <span
            className={`session-notes__status session-notes__status--${status.className}`}
          >
            <span className="session-notes__status-icon">{status.icon}</span>
            <span className="session-notes__status-text">{status.text}</span>
          </span>
          <button
            type="button"
            className="session-notes__toggle"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "▼" : "▲"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="session-notes__body">
          {isTeacher ? (
            <>
              <textarea
                ref={textareaRef}
                className="session-notes__textarea"
                value={notes}
                onChange={handleNotesChange}
                placeholder="Take notes during the session...

• Key discussion points
• Learner's strengths observed
• Areas to work on
• Homework/next steps"
                maxLength={maxCharacters}
              />
              <div className="session-notes__footer">
                <span className="session-notes__count">
                  {characterCount.toLocaleString()} /{" "}
                  {maxCharacters.toLocaleString()}
                </span>
                <div className="session-notes__actions">
                  {saveStatus === "unsaved" && (
                    <button
                      type="button"
                      className="session-notes__save-btn"
                      onClick={handleManualSave}
                    >
                      Save Now
                    </button>
                  )}
                  <span className="session-notes__hint">Ctrl+S to save</span>
                </div>
              </div>
            </>
          ) : (
            <div className="session-notes__content">
              {notes ? (
                <p className="session-notes__text">{notes}</p>
              ) : (
                <p className="session-notes__empty">
                  No notes have been added for this session yet.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
