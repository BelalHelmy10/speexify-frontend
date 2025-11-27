// app/resources/prep/PrepShell.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PrepNotes from "./PrepNotes";
import PdfViewerWithSidebar from "./PdfViewerWithSidebar";

const TOOL_NONE = "none";
const TOOL_PEN = "pen";
const TOOL_HIGHLIGHTER = "highlighter";
const TOOL_NOTE = "note";
const TOOL_POINTER = "pointer";
const TOOL_ERASER = "eraser";
const TOOL_TEXT = "text";

const PEN_COLORS = ["#f9fafb", "#fbbf24", "#60a5fa", "#f97316", "#22c55e"];

/**
 * Props:
 *  - resource, viewer: as before (prep room)
 *  - hideSidebar (optional): when true, do NOT render the left info/notes column
 *  - hideBreadcrumbs (optional): when true, no breadcrumbs row
 *  - classroomChannel (optional): { ready, send, subscribe } for classroom sync
 */
export default function PrepShell({
  resource,
  viewer,
  hideSidebar = false,
  hideBreadcrumbs = false,
  classroomChannel = null,
}) {
  const [focusMode, setFocusMode] = useState(false);
  const [tool, setTool] = useState(TOOL_NONE);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pointerPos, setPointerPos] = useState(null);
  const [stickyNotes, setStickyNotes] = useState([]);
  const [textBoxes, setTextBoxes] = useState([]);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [dragState, setDragState] = useState(null);
  const [activeTextId, setActiveTextId] = useState(null);
  const [pdfFallback, setPdfFallback] = useState(false); // if pdf.js fails, fall back to iframe

  const canvasRef = useRef(null);

  // 🔥 remote drawing state (for strokes coming from the other side)
  const remoteDrawRef = useRef({
    isDrawing: false,
    last: null, // { nx, ny }
    tool: null,
    color: null,
  });

  const storageKey = `prep_annotations_${resource._id}`;

  const viewerUrl = viewer?.viewerUrl || null;
  const unit = resource.unit;
  const subLevel = unit?.subLevel;
  const level = subLevel?.level;
  const track = level?.track;

  const viewerActive = !!viewerUrl;
  const hasChannel = !!classroomChannel?.ready;

  // Focus newly-activated text box
  useEffect(() => {
    if (!activeTextId) return;
    const el = document.querySelector(`[data-textbox-id="${activeTextId}"]`);
    if (el) el.focus();
  }, [activeTextId]);

  // Load annotations from localStorage
  useEffect(() => {
    if (!storageKey) return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.stickyNotes)) {
        setStickyNotes(parsed.stickyNotes);
      }
      if (Array.isArray(parsed.textBoxes)) {
        setTextBoxes(parsed.textBoxes);
      }

      if (parsed.canvasData && canvasRef.current) {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = parsed.canvasData;
      }
    } catch (err) {
      console.warn("Failed to load annotations", err);
    }
  }, [storageKey]);

  // Resize annotation canvas to match its container (overlay parent)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement || canvas;
    if (!container) return;

    function resizeCanvas() {
      const rect = container.getBoundingClientRect();
      const prev = canvas.toDataURL("image/png");

      canvas.width = rect.width;
      canvas.height = rect.height;

      if (prev) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
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

  // Save annotations (canvas + notes + text)
  function saveAnnotations(opts = {}) {
    if (!storageKey) return;
    try {
      const canvas = canvasRef.current;
      const canvasData =
        opts.canvasData ?? (canvas ? canvas.toDataURL("image/png") : undefined);

      const data = {
        canvasData: canvasData || null,
        stickyNotes: opts.stickyNotes ?? stickyNotes,
        textBoxes: opts.textBoxes ?? textBoxes,
      };

      window.localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn("Failed to save annotations", err);
    }
  }

  // Geometry helper – use overlay parent container
  function getCanvasCoordinates(event) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const container = canvas.parentElement || canvas;
    const rect = container.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  // Apply stroke style (local + remote)
  function applyStrokeStyle(ctx, strokeTool, color) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (strokeTool === TOOL_PEN) {
      ctx.strokeStyle = color || penColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    } else if (strokeTool === TOOL_HIGHLIGHTER) {
      ctx.strokeStyle = "rgba(250, 224, 120, 0.3)";
      ctx.lineWidth = 18;
      ctx.globalAlpha = 0.3;
      ctx.globalCompositeOperation = "source-over";
    } else if (strokeTool === TOOL_ERASER) {
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = 20;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "destination-out";
    }
  }

  // Drawing (pen / highlighter / eraser)
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

    // 🔥 broadcast start of stroke (normalized)
    if (
      hasChannel &&
      (tool === TOOL_PEN || tool === TOOL_HIGHLIGHTER || tool === TOOL_ERASER)
    ) {
      const nx = coords.x / coords.width;
      const ny = coords.y / coords.height;
      classroomChannel.send({
        type: "ANNOTATION_DRAW_START",
        tool,
        color: penColor,
        nx,
        ny,
      });
    }
  }

  function draw(e) {
    // dragging notes / text
    if (dragState) {
      const coords = getCanvasCoordinates(e);
      if (!coords) return;
      const { width, height, x, y } = coords;

      if (dragState.kind === "note") {
        setStickyNotes((prev) => {
          const updated = prev.map((n) => {
            if (n.id !== dragState.id) return n;
            const nx = (x + dragState.offsetX) / width;
            const ny = (y + dragState.offsetY) / height;
            return {
              ...n,
              x: Math.min(0.98, Math.max(0.02, nx)),
              y: Math.min(0.98, Math.max(0.02, ny)),
            };
          });
          saveAnnotations({ stickyNotes: updated });
          return updated;
        });
      } else if (dragState.kind === "text") {
        setTextBoxes((prev) => {
          const updated = prev.map((t) => {
            if (t.id !== dragState.id) return t;
            const nx = (x + dragState.offsetX) / width;
            const ny = (y + dragState.offsetY) / height;
            return {
              ...t,
              x: Math.min(0.98, Math.max(0.02, nx)),
              y: Math.min(0.98, Math.max(0.02, ny)),
            };
          });
          saveAnnotations({ textBoxes: updated });
          return updated;
        });
      }
      return;
    }

    if (!isDrawing) {
      if (tool === TOOL_POINTER) {
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

    applyStrokeStyle(ctx, tool, penColor);

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    // 🔥 broadcast stroke segment (normalized)
    if (hasChannel) {
      const nx = coords.x / coords.width;
      const ny = coords.y / coords.height;
      classroomChannel.send({
        type: "ANNOTATION_DRAW_MOVE",
        tool,
        color: penColor,
        nx,
        ny,
      });
    }
  }

  function stopDrawing() {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveAnnotations();

    // 🔥 broadcast stroke end
    if (hasChannel) {
      classroomChannel.send({
        type: "ANNOTATION_DRAW_END",
      });
    }
  }

  // Pointer
  function updatePointer(e) {
    if (tool !== TOOL_POINTER) {
      setPointerPos(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement || canvas;
    const rect = container.getBoundingClientRect();
    setPointerPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  // Sticky notes
  function handleClickForNote(e) {
    if (tool !== TOOL_NOTE) return;

    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    const { x, y, width, height } = coords;

    const note = {
      id: `note_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      x: x / width,
      y: y / height,
      text: "",
    };

    const nextNotes = [...stickyNotes, note];
    setStickyNotes(nextNotes);
    saveAnnotations({ stickyNotes: nextNotes });

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

  function startNoteDrag(e, note) {
    e.stopPropagation();
    e.preventDefault();
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    const { x, y, width } = coords;
    const currentX = note.x * width;
    const currentY = note.y * coords.height;

    setDragState({
      kind: "note",
      id: note.id,
      offsetX: currentX - x,
      offsetY: currentY - y,
    });
  }

  // Text boxes
  function createTextBox(e) {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    const { x, y, width, height } = coords;

    const box = {
      id: `text_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      x: x / width,
      y: y / height,
      text: "",
      color: penColor,
    };

    const next = [...textBoxes, box];
    setTextBoxes(next);
    setActiveTextId(box.id);
    saveAnnotations({ textBoxes: next });
  }

  function updateTextBoxText(id, text) {
    const next = textBoxes.map((t) => (t.id === id ? { ...t, text } : t));
    setTextBoxes(next);
    saveAnnotations({ textBoxes: next });
  }

  function deleteTextBox(id) {
    const next = textBoxes.filter((t) => t.id !== id);
    setTextBoxes(next);
    saveAnnotations({ textBoxes: next });
    if (activeTextId === id) setActiveTextId(null);
  }

  function startTextDrag(e, box) {
    e.stopPropagation();
    e.preventDefault();
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    const { x, y, width, height } = coords;
    const currentX = box.x * width;
    const currentY = box.y * height;

    setDragState({
      kind: "text",
      id: box.id,
      offsetX: currentX - x,
      offsetY: currentY - y,
    });
  }

  // Clear all
  function clearCanvasAndNotes() {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setStickyNotes([]);
    setTextBoxes([]);
    setDragState(null);
    setActiveTextId(null);
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ canvasData: null, stickyNotes: [], textBoxes: [] })
      );
    } catch (err) {
      console.warn("Failed to clear annotations", err);
    }
  }

  // Mouse handlers
  function handleMouseDown(e) {
    const target = e.target;
    if (
      target.closest &&
      (target.closest(".prep-sticky-note") || target.closest(".prep-text-box"))
    ) {
      return;
    }

    if (tool === TOOL_TEXT) {
      e.preventDefault();
      if (activeTextId) {
        setActiveTextId(null);
        setTool(TOOL_NONE);
        return;
      }
      createTextBox(e);
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
    if (dragState) {
      e.preventDefault();
      draw(e);
      return;
    }

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
    if (dragState) {
      setDragState(null);
      saveAnnotations();
    }
  }

  // UI helper
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

  // 🔥 Subscribe to remote draw events
  useEffect(() => {
    if (!classroomChannel) return;
    if (!classroomChannel.subscribe) return;

    const unsubscribe = classroomChannel.subscribe((msg) => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const container = canvas.parentElement || canvas;
      const rect = container.getBoundingClientRect();

      if (msg.type === "ANNOTATION_DRAW_START") {
        const { nx, ny, tool: remoteTool, color } = msg;
        if (typeof nx !== "number" || typeof ny !== "number") return;

        const x = nx * rect.width;
        const y = ny * rect.height;

        applyStrokeStyle(ctx, remoteTool, color);

        ctx.beginPath();
        ctx.moveTo(x, y);

        remoteDrawRef.current = {
          isDrawing: true,
          last: { nx, ny },
          tool: remoteTool,
          color: color || PEN_COLORS[0],
        };
      }

      if (msg.type === "ANNOTATION_DRAW_MOVE") {
        const { nx, ny, tool: remoteTool, color } = msg;
        if (typeof nx !== "number" || typeof ny !== "number") return;

        const state = remoteDrawRef.current;
        const prev = state.last;

        const x = nx * rect.width;
        const y = ny * rect.height;

        applyStrokeStyle(ctx, remoteTool, color);

        ctx.beginPath();
        if (
          prev &&
          typeof prev.nx === "number" &&
          typeof prev.ny === "number"
        ) {
          const px = prev.nx * rect.width;
          const py = prev.ny * rect.height;
          ctx.moveTo(px, py);
        } else {
          ctx.moveTo(x, y);
        }
        ctx.lineTo(x, y);
        ctx.stroke();

        remoteDrawRef.current = {
          isDrawing: true,
          last: { nx, ny },
          tool: remoteTool,
          color: color || PEN_COLORS[0],
        };
      }

      if (msg.type === "ANNOTATION_DRAW_END") {
        remoteDrawRef.current = {
          isDrawing: false,
          last: null,
          tool: null,
          color: null,
        };
        // Persist whatever is now on the canvas along with local notes/text
        saveAnnotations();
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomChannel]);

  // Shared annotation overlay (canvas + notes + text + pointer)
  function renderAnnotationsOverlay() {
    return (
      <>
        <canvas
          ref={canvasRef}
          className={
            "prep-annotate-canvas" +
            (tool !== TOOL_NONE ? " prep-annotate-canvas--drawing" : "")
          }
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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
          >
            <div
              className="prep-sticky-note__header"
              onMouseDown={(e) => startNoteDrag(e, note)}
            >
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
              onChange={(e) => updateNoteText(note.id, e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        ))}

        {/* Text boxes */}
        {textBoxes.map((box) => {
          const isEditing = activeTextId === box.id;
          return (
            <div
              key={box.id}
              className={
                "prep-text-box" + (isEditing ? " prep-text-box--editing" : "")
              }
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
              }}
            >
              {isEditing ? (
                <>
                  <div
                    className="prep-text-box__header"
                    onMouseDown={(e) => startTextDrag(e, box)}
                  >
                    <span className="prep-text-box__drag-handle" />
                    <button
                      type="button"
                      className="prep-text-box__close"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTextBox(box.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <textarea
                    data-textbox-id={box.id}
                    className="prep-text-box__textarea"
                    style={{ color: box.color }}
                    placeholder="Type…"
                    value={box.text}
                    onChange={(e) => updateTextBoxText(box.id, e.target.value)}
                    onBlur={() => setActiveTextId(null)}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </>
              ) : (
                <div
                  className="prep-text-box__label"
                  style={{ color: box.color }}
                  onMouseDown={(e) => startTextDrag(e, box)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setActiveTextId(box.id);
                  }}
                >
                  {box.text}
                </div>
              )}
            </div>
          );
        })}

        {/* Pointer arrow (local only for now) */}
        {tool === TOOL_POINTER && pointerPos && (
          <div
            className="prep-pointer"
            style={{
              left: `${pointerPos.x}px`,
              top: `${pointerPos.y}px`,
            }}
          />
        )}
      </>
    );
  }

  // NOTE: Your viewer types use "pdf" for PDF resources.
  const isPdf = viewer?.type === "pdf" && !pdfFallback;

  const showSidebar = !hideSidebar;
  const showBreadcrumbs = !hideBreadcrumbs;

  const layoutClasses =
    "prep-layout" +
    (focusMode ? " prep-layout--focus" : "") +
    (hideSidebar ? " prep-layout--no-sidebar" : "");

  return (
    <>
      {/* Breadcrumbs (optional) */}
      {showBreadcrumbs && (
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
      )}

      <div className={layoutClasses}>
        {/* LEFT: info + notes (hidden in classroom mode) */}
        {showSidebar && (
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
        )}

        {/* RIGHT: viewer */}
        <section className="prep-viewer">
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

              {/* Toolbar */}
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
                    (tool === TOOL_TEXT ? " is-active" : "")
                  }
                  onClick={() => setToolSafe(TOOL_TEXT)}
                >
                  ✍️ <span>Text</span>
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
                  ➤ <span>Pointer</span>
                </button>
                <button
                  type="button"
                  className="prep-annotate-toolbar__btn prep-annotate-toolbar__btn--danger"
                  onClick={clearCanvasAndNotes}
                >
                  🗑️ <span>Clear all</span>
                </button>

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
                {isPdf ? (
                  // PDF + sidebar (pdf.js) – overlay lives INSIDE PdfViewerWithSidebar
                  <div className="prep-viewer__canvas-container">
                    <PdfViewerWithSidebar
                      fileUrl={viewerUrl}
                      onFatalError={() => setPdfFallback(true)}
                    >
                      {renderAnnotationsOverlay()}
                    </PdfViewerWithSidebar>
                  </div>
                ) : (
                  // Fallback: iframe viewer (YouTube, Slides, external or PDF if pdf.js failed)
                  <div
                    className="prep-viewer__canvas-container"
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
                    {renderAnnotationsOverlay()}
                  </div>
                )}
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
