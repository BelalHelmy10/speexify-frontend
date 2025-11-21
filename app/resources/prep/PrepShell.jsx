// app/resources/prep/PrepShell.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PrepNotes from "./PrepNotes";

const TOOL_NONE = "none";
const TOOL_PEN = "pen";
const TOOL_HIGHLIGHTER = "highlighter";
const TOOL_NOTE = "note";
const TOOL_POINTER = "pointer";
const TOOL_ERASER = "eraser";

const PEN_COLORS = ["#f9fafb", "#fbbf24", "#60a5fa", "#f97316", "#22c55e"];

export default function PrepShell({ resource, viewer }) {
  const [focusMode, setFocusMode] = useState(false);
  const [tool, setTool] = useState(TOOL_NONE);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pointerPos, setPointerPos] = useState(null);
  const [stickyNotes, setStickyNotes] = useState([]);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]); // multiple pen colors

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const storageKey = `prep_annotations_${resource._id}`;

  const viewerUrl = viewer?.viewerUrl;
  const unit = resource.unit;
  const subLevel = unit?.subLevel;
  const level = subLevel?.level;
  const track = level?.track;

  // ─────────────────────────────────────────────────────────────
  // Load annotations from localStorage on mount
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!storageKey) return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.stickyNotes)) {
        setStickyNotes(parsed.stickyNotes);
      }

      if (parsed.canvasData && canvasRef.current) {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = parsed.canvasData;
      }
    } catch (err) {
      console.warn("Failed to load annotations", err);
    }
  }, [storageKey]);

  // ─────────────────────────────────────────────────────────────
  // Canvas resize to match container
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    function resizeCanvas() {
      const rect = container.getBoundingClientRect();
      const prev = canvas.toDataURL("image/png");

      canvas.width = rect.width;
      canvas.height = rect.height;

      if (prev) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = prev;
      }
    }

    resizeCanvas();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => resizeCanvas());
      observer.observe(container);
      return () => observer.disconnect();
    } else {
      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Helper: save current canvas + notes to localStorage
  // ─────────────────────────────────────────────────────────────
  function saveAnnotations(opts = {}) {
    if (!storageKey) return;
    try {
      const canvas = canvasRef.current;
      const canvasData =
        opts.canvasData ?? (canvas ? canvas.toDataURL("image/png") : undefined);

      const data = {
        canvasData: canvasData || null,
        stickyNotes: opts.stickyNotes ?? stickyNotes,
      };

      window.localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn("Failed to save annotations", err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Drawing helpers
  // ─────────────────────────────────────────────────────────────
  function getCanvasCoordinates(event) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function startDrawing(e) {
    if (tool !== TOOL_PEN && tool !== TOOL_HIGHLIGHTER && tool !== TOOL_ERASER)
      return;
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  }

  function draw(e) {
    if (!isDrawing) {
      if (tool === TOOL_POINTER) {
        // update pointer position only
        updatePointer(e);
      }
      return;
    }

    if (tool !== TOOL_PEN && tool !== TOOL_HIGHLIGHTER && tool !== TOOL_ERASER)
      return;

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === TOOL_PEN) {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    } else if (tool === TOOL_HIGHLIGHTER) {
      ctx.strokeStyle = "rgba(250, 204, 21, 0.6)"; // yellow-ish
      ctx.lineWidth = 10;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "multiply";
    } else if (tool === TOOL_ERASER) {
      // erase by drawing with destination-out
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = 18;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "destination-out";
    }

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveAnnotations(); // save current canvas + notes
  }

  // ─────────────────────────────────────────────────────────────
  // Pointer helper
  // ─────────────────────────────────────────────────────────────
  function updatePointer(e) {
    if (tool !== TOOL_POINTER) {
      setPointerPos(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setPointerPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Sticky notes
  // ─────────────────────────────────────────────────────────────
  function handleClickForNote(e) {
    if (tool !== TOOL_NOTE) return;

    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    const { x, y, width, height } = coords;

    const note = {
      id: `note_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      x: x / width,
      y: y / height, // store as fractions to keep responsive
      text: "",
    };

    const nextNotes = [...stickyNotes, note];
    setStickyNotes(nextNotes);
    saveAnnotations({ stickyNotes: nextNotes });

    // After placing one note, auto-exit note tool so next click edits
    setTool(TOOL_NONE);
  }

  function updateNoteText(id, text) {
    const next = stickyNotes.map((n) => (n.id === id ? { ...n, text } : n));
    setStickyNotes(next);
    saveAnnotations({ stickyNotes: next });
  }

  function deleteNote(id) {
    const next = stickyNotes.filter((n) => n.id !== id);
    setStickyNotes(next);
    saveAnnotations({ stickyNotes: next });
  }

  function clearCanvasAndNotes() {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setStickyNotes([]);
    // wipe everything for this resource
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ canvasData: null, stickyNotes: [] })
      );
    } catch (err) {
      console.warn("Failed to clear annotations", err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Combined mouse handlers for container
  // ─────────────────────────────────────────────────────────────
  function handleMouseDown(e) {
    // If clicking on a sticky note, don't create a new one / draw
    if (e.target.closest && e.target.closest(".prep-sticky-note")) {
      return;
    }

    if (
      tool === TOOL_PEN ||
      tool === TOOL_HIGHLIGHTER ||
      tool === TOOL_ERASER
    ) {
      e.preventDefault();
      startDrawing(e);
    } else if (tool === TOOL_NOTE) {
      e.preventDefault();
      handleClickForNote(e);
    }
  }

  function handleMouseMove(e) {
    if (tool === TOOL_POINTER) {
      updatePointer(e);
    } else {
      setPointerPos(null);
    }
    if (
      tool === TOOL_PEN ||
      tool === TOOL_HIGHLIGHTER ||
      tool === TOOL_ERASER
    ) {
      e.preventDefault();
      draw(e);
    }
  }

  function handleMouseUp() {
    stopDrawing();
  }

  // ─────────────────────────────────────────────────────────────
  // UI helpers
  // ─────────────────────────────────────────────────────────────
  function setToolSafe(nextTool) {
    if (tool === nextTool) {
      setTool(TOOL_NONE);
      setPointerPos(null);
    } else {
      setTool(nextTool);
      if (nextTool !== TOOL_POINTER) {
        setPointerPos(null);
      }
    }
  }

  const viewerActive = Boolean(viewerUrl);

  return (
    <>
      {/* Breadcrumbs */}
      <nav className="unit-breadcrumbs prep-breadcrumbs">
        <Link href="/resources" className="unit-breadcrumbs__link">
          Resources
        </Link>
        {track && (
          <>
            <span className="unit-breadcrumbs__separator">/</span>
            <span className="unit-breadcrumbs__crumb">{track.name}</span>
          </>
        )}
        {level && (
          <>
            <span className="unit-breadcrumbs__separator">/</span>
            <span className="unit-breadcrumbs__crumb">{level.name}</span>
          </>
        )}
        {subLevel && (
          <>
            <span className="unit-breadcrumbs__separator">/</span>
            <span className="unit-breadcrumbs__crumb">
              {subLevel.code} – {subLevel.title}
            </span>
          </>
        )}
        {unit && (
          <>
            <span className="unit-breadcrumbs__separator">/</span>
            <span className="unit-breadcrumbs__crumb">{unit.title}</span>
          </>
        )}
        <span className="unit-breadcrumbs__separator">/</span>
        <span className="unit-breadcrumbs__crumb prep-breadcrumbs__current">
          Prep Room
        </span>
      </nav>

      <div className={"prep-layout" + (focusMode ? " prep-layout--focus" : "")}>
        {/* LEFT: info + notes */}
        <aside className="prep-info-card">
          <div className="prep-info-card__header">
            <h1 className="prep-info-card__title">{resource.title}</h1>
            {resource.fileName && (
              <p className="prep-info-card__filename">{resource.fileName}</p>
            )}
          </div>

          {resource.description && (
            <p className="prep-info-card__description">
              {resource.description}
            </p>
          )}

          <div className="prep-info-card__meta">
            {resource.kind && (
              <span className="resources-chip">{resource.kind}</span>
            )}
            {resource.cecrLevel && (
              <span className="resources-chip resources-chip--primary">
                CEFR {resource.cecrLevel}
              </span>
            )}
            {resource.sourceType && (
              <span className="resources-chip">{resource.sourceType}</span>
            )}
          </div>

          {Array.isArray(resource.tags) && resource.tags.length > 0 && (
            <div className="prep-info-card__tags">
              {resource.tags.map((tag) => (
                <span key={tag} className="resources-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="prep-info-card__actions">
            <Link
              href="/resources"
              className="resources-button resources-button--ghost"
            >
              Back to picker
            </Link>
            {unit?.slug && (
              <Link
                href={`/resources/units/${unit.slug}`}
                className="resources-button resources-button--ghost"
              >
                View unit page
              </Link>
            )}
            {viewer?.rawUrl && (
              <a
                href={viewer.rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="resources-button resources-button--primary"
              >
                Open raw link
              </a>
            )}
          </div>

          <PrepNotes resourceId={resource._id} />
        </aside>

        {/* RIGHT: viewer */}
        <section className="prep-viewer">
          {/* Focus toggle */}
          {viewerActive && (
            <button
              type="button"
              className="prep-viewer__focus-toggle"
              onClick={() => setFocusMode((v) => !v)}
            >
              {focusMode ? "Exit focus" : "Focus viewer"}
            </button>
          )}

          {viewerActive ? (
            <>
              <div className="prep-viewer__badge">
                <span className="prep-viewer__badge-dot" />
                <span className="prep-viewer__badge-text">
                  Live preview · {viewer.label}
                </span>
              </div>

              {/* Annotation toolbar */}
              <div className="prep-annotate-toolbar">
                <button
                  type="button"
                  className={
                    "prep-annotate-toolbar__btn" +
                    (tool === TOOL_PEN ? " is-active" : "")
                  }
                  onClick={() => setToolSafe(TOOL_PEN)}
                >
                  🖊️ <span>Pen</span>
                </button>
                <button
                  type="button"
                  className={
                    "prep-annotate-toolbar__btn" +
                    (tool === TOOL_HIGHLIGHTER ? " is-active" : "")
                  }
                  onClick={() => setToolSafe(TOOL_HIGHLIGHTER)}
                >
                  ✨ <span>Highlighter</span>
                </button>
                <button
                  type="button"
                  className={
                    "prep-annotate-toolbar__btn" +
                    (tool === TOOL_ERASER ? " is-active" : "")
                  }
                  onClick={() => setToolSafe(TOOL_ERASER)}
                >
                  🧽 <span>Eraser</span>
                </button>
                <button
                  type="button"
                  className={
                    "prep-annotate-toolbar__btn" +
                    (tool === TOOL_NOTE ? " is-active" : "")
                  }
                  onClick={() => setToolSafe(TOOL_NOTE)}
                >
                  🗒️ <span>Note</span>
                </button>
                <button
                  type="button"
                  className={
                    "prep-annotate-toolbar__btn" +
                    (tool === TOOL_POINTER ? " is-active" : "")
                  }
                  onClick={() => setToolSafe(TOOL_POINTER)}
                >
                  🔴 <span>Pointer</span>
                </button>
                <button
                  type="button"
                  className="prep-annotate-toolbar__btn prep-annotate-toolbar__btn--danger"
                  onClick={clearCanvasAndNotes}
                >
                  🗑️ <span>Clear all</span>
                </button>

                {/* Pen color picker */}
                <div className="prep-annotate-colors">
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={
                        "prep-annotate-color" +
                        (penColor === c ? " is-active" : "")
                      }
                      style={{ backgroundColor: c }}
                      onClick={() => setPenColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="prep-viewer__frame-wrapper">
                <div
                  className="prep-viewer__canvas-container"
                  ref={containerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <iframe
                    src={viewerUrl}
                    className="prep-viewer__frame"
                    title={`${resource.title} – ${viewer.label}`}
                    allow={
                      viewer.type === "youtube"
                        ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        : undefined
                    }
                    allowFullScreen
                  />
                  <canvas
                    ref={canvasRef}
                    className={
                      "prep-annotate-canvas" +
                      (tool === TOOL_PEN ||
                      tool === TOOL_HIGHLIGHTER ||
                      tool === TOOL_ERASER
                        ? " prep-annotate-canvas--drawing"
                        : "")
                    }
                  />

                  {/* Sticky notes */}
                  {stickyNotes.map((note) => (
                    <div
                      key={note.id}
                      className="prep-sticky-note"
                      style={{
                        left: `${note.x * 100}%`,
                        top: `${note.y * 100}%`,
                      }}
                      onMouseDown={(e) => {
                        // don't start drawing / create note when grabbing note
                        e.stopPropagation();
                      }}
                    >
                      <div className="prep-sticky-note__header">
                        <button
                          type="button"
                          className="prep-sticky-note__close"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote(note.id);
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <textarea
                        className="prep-sticky-note__textarea"
                        placeholder="Note..."
                        value={note.text}
                        onChange={(e) =>
                          updateNoteText(note.id, e.target.value)
                        }
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  ))}

                  {/* Pointer indicator */}
                  {tool === TOOL_POINTER && pointerPos && (
                    <div
                      className="prep-pointer"
                      style={{
                        left: `${pointerPos.x}px`,
                        top: `${pointerPos.y}px`,
                      }}
                    />
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="prep-viewer__placeholder">
              <h2>No preview available</h2>
              <p>
                This resource doesn&apos;t have an embeddable URL. Use the
                session notes on the left or open the raw link instead.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
