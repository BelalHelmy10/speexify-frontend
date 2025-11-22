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

export default function PrepShell({ resource, viewer }) {
  const [focusMode, setFocusMode] = useState(false);
  const [tool, setTool] = useState(TOOL_NONE);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pointerPos, setPointerPos] = useState(null);
  const [stickyNotes, setStickyNotes] = useState([]);
  const [textBoxes, setTextBoxes] = useState([]);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [dragState, setDragState] = useState(null); // {kind: "note"|"text", id, offsetX, offsetY}
  const [activeTextId, setActiveTextId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfFailed, setPdfFailed] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const storageKey = `prep_annotations_${resource._id}`;

  const viewerUrl = viewer?.viewerUrl;
  const unit = resource.unit;
  const subLevel = unit?.subLevel;
  const level = subLevel?.level;
  const track = level?.track;

  const isPdfFile =
    viewer?.type === "file" &&
    viewer?.rawUrl &&
    viewer.rawUrl.toLowerCase().endsWith(".pdf");

  const usePdfJs = isPdfFile && !pdfFailed;
  const viewerActive = Boolean(viewerUrl);

  // Focus newly-created / activated text box
  useEffect(() => {
    if (!activeTextId) return;
    const el = document.querySelector(`[data-textbox-id="${activeTextId}"]`);
    if (el && el.focus) {
      el.focus();
    }
  }, [activeTextId]);

  // ─────────────────────────────────────────────────────────────
  // Load annotations for a specific page from localStorage
  // ─────────────────────────────────────────────────────────────
  function loadAnnotationsForPage(pageNumber) {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        // nothing saved yet
        clearCanvasOnly();
        setStickyNotes([]);
        setTextBoxes([]);
        return;
      }

      const parsed = JSON.parse(raw);
      const pages = parsed.pages || {};
      const pageData = pages[String(pageNumber)] || {};

      setStickyNotes(
        Array.isArray(pageData.stickyNotes) ? pageData.stickyNotes : []
      );
      setTextBoxes(Array.isArray(pageData.textBoxes) ? pageData.textBoxes : []);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (pageData.canvasData) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = pageData.canvasData;
        }
      }
    } catch (err) {
      console.warn("Failed to load annotations", err);
    }
  }

  function clearCanvasOnly() {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // Load annotations when page changes or on first mount
  useEffect(() => {
    loadAnnotationsForPage(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, currentPage]);

  // ─────────────────────────────────────────────────────────────
  // Canvas resize to match container
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    function resizeCanvas() {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // After resize, re-draw annotations for the current page
      loadAnnotationsForPage(currentPage);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // ─────────────────────────────────────────────────────────────
  // Helper: save current canvas + notes + text to localStorage
  // Stored PER PAGE: { pages: { "1": { ... }, "2": { ... } } }
  // ─────────────────────────────────────────────────────────────
  function saveAnnotations(opts = {}) {
    if (!storageKey) return;

    try {
      const canvas = canvasRef.current;
      const canvasData =
        opts.canvasData ?? (canvas ? canvas.toDataURL("image/png") : undefined);

      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : { pages: {} };
      const pages = parsed.pages || {};
      const pageKey = String(currentPage);
      const existingPage = pages[pageKey] || {};

      const pageData = {
        canvasData:
          canvasData !== undefined
            ? canvasData
            : existingPage.canvasData || null,
        stickyNotes: opts.stickyNotes ?? stickyNotes,
        textBoxes: opts.textBoxes ?? textBoxes,
      };

      const next = {
        ...parsed,
        pages: {
          ...pages,
          [pageKey]: pageData,
        },
      };

      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (err) {
      console.warn("Failed to save annotations", err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Geometry helpers
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

  // ─────────────────────────────────────────────────────────────
  // Drawing (pen / highlighter / eraser)
  // ─────────────────────────────────────────────────────────────
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

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === TOOL_PEN) {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    } else if (tool === TOOL_HIGHLIGHTER) {
      ctx.strokeStyle = "rgba(250, 224, 120, 0.25)";
      ctx.lineWidth = 18;
      ctx.globalAlpha = 0.25;
      ctx.globalCompositeOperation = "source-over";
    } else if (tool === TOOL_ERASER) {
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = 20;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "destination-out";
    }

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveAnnotations(); // save canvas + current notes/text for current page
  }

  // ─────────────────────────────────────────────────────────────
  // Pointer (arrow)
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
      y: y / height,
      text: "",
    };

    const nextNotes = [...stickyNotes, note];
    setStickyNotes(nextNotes);
    saveAnnotations({ stickyNotes: nextNotes });

    // auto-exit note tool
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
    const { x, y, width, height } = coords;
    const currentX = note.x * width;
    const currentY = note.y * height;

    setDragState({
      kind: "note",
      id: note.id,
      offsetX: currentX - x,
      offsetY: currentY - y,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Text boxes (writing tool)
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // Clear current page
  // ─────────────────────────────────────────────────────────────
  function clearCanvasAndNotes() {
    clearCanvasOnly();
    setStickyNotes([]);
    setTextBoxes([]);
    setDragState(null);
    setActiveTextId(null);
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : { pages: {} };
      const pages = parsed.pages || {};
      const pageKey = String(currentPage);
      const next = {
        ...parsed,
        pages: {
          ...pages,
          [pageKey]: {
            canvasData: null,
            stickyNotes: [],
            textBoxes: [],
          },
        },
      };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (err) {
      console.warn("Failed to clear annotations", err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Combined mouse handlers for container
  // ─────────────────────────────────────────────────────────────
  function handleMouseDown(e) {
    // clicks on notes or text boxes should not start drawing / new elements
    if (
      e.target.closest &&
      (e.target.closest(".prep-sticky-note") ||
        e.target.closest(".prep-text-box"))
    ) {
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
    } else if (tool === TOOL_TEXT) {
      e.preventDefault();
      createTextBox(e);
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

  function handleChangePage(nextPage) {
    // Save current page annotations before switching
    saveAnnotations();
    setCurrentPage(nextPage);
  }

  const viewerLabel = viewer?.label || "File";

  const overlay = (
    <>
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
      {textBoxes.map((box) => (
        <div
          key={box.id}
          className="prep-text-box"
          style={{
            left: `${box.x * 100}%`,
            top: `${box.y * 100}%`,
          }}
        >
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
            onFocus={() => setActiveTextId(box.id)}
            onChange={(e) => updateTextBoxText(box.id, e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      ))}

      {/* Pointer arrow */}
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
                  Live preview · {viewerLabel}
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
                  🗑️ <span>Clear current page</span>
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
                {usePdfJs ? (
                  <PdfViewerWithSidebar
                    fileUrl={viewer.rawUrl}
                    containerRef={containerRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    currentPage={currentPage}
                    onChangePage={handleChangePage}
                    onFatalError={() => setPdfFailed(true)}
                  >
                    {overlay}
                  </PdfViewerWithSidebar>
                ) : (
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
                      title={`${resource.title} – ${viewerLabel}`}
                      allow={
                        viewer.type === "youtube"
                          ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          : undefined
                      }
                      allowFullScreen
                    />
                    {overlay}
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
