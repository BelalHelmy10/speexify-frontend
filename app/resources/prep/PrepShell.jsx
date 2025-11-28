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

const PEN_COLORS = ["#000000", "#fbbf24", "#60a5fa", "#FF0000", "#22c55e"];

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
  const [remotePointerPos, setRemotePointerPos] = useState(null); // remote pointer
  const [stickyNotes, setStickyNotes] = useState([]);
  const [textBoxes, setTextBoxes] = useState([]);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [dragState, setDragState] = useState(null);
  const [activeTextId, setActiveTextId] = useState(null);
  const [pdfFallback, setPdfFallback] = useState(false); // if pdf.js fails, fall back to iframe

  const canvasRef = useRef(null);

  const storageKey = `prep_annotations_${resource._id}`;

  const viewerUrl = viewer?.viewerUrl || null;
  const unit = resource.unit;
  const subLevel = unit?.subLevel;
  const level = subLevel?.level;
  const track = level?.track;

  const viewerActive = !!viewerUrl;

  // Classroom channel helpers
  const channelReady = classroomChannel?.ready || false;
  const channelSend = classroomChannel?.send || null;
  const channelSubscribe = classroomChannel?.subscribe || null;

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

  // Resize annotation canvas to match its parent container
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

  // Geometry helper – relative to the overlay parent, not the PDF canvas
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

  // Drawing (pen / highlighter / eraser) – still local for now
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

          // broadcast NOTE_MOVE
          if (channelReady && channelSend) {
            const moved = updated.find((n) => n.id === dragState.id);
            if (moved) {
              channelSend({
                type: "ANNOTATION_NOTE_MOVE",
                id: moved.id,
                x: moved.x,
                y: moved.y,
              });
            }
          }

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

          // broadcast TEXT_MOVE
          if (channelReady && channelSend) {
            const moved = updated.find((t) => t.id === dragState.id);
            if (moved) {
              channelSend({
                type: "ANNOTATION_TEXT_MOVE",
                id: moved.id,
                x: moved.x,
                y: moved.y,
              });
            }
          }

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
      ctx.strokeStyle = "rgba(250, 224, 120, 0.3)";
      ctx.lineWidth = 18;
      ctx.globalAlpha = 0.3;
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
    saveAnnotations();
  }

  // Pointer (local + sync)
  function updatePointer(e) {
    if (tool !== TOOL_POINTER) {
      setPointerPos(null);
      if (channelReady && channelSend) {
        channelSend({ type: "ANNOTATION_POINTER_HIDE" });
      }
      return;
    }

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    setPointerPos({ x: coords.x, y: coords.y });

    if (channelReady && channelSend) {
      const nx = coords.x / coords.width;
      const ny = coords.y / coords.height;
      channelSend({
        type: "ANNOTATION_POINTER_MOVE",
        nx,
        ny,
      });
    }
  }

  // Receive remote pointer + notes + text + clear events
  useEffect(() => {
    if (!channelSubscribe) return;

    const unsubscribe = channelSubscribe((message) => {
      if (!message || !message.type) return;

      const t = message.type;

      if (t === "ANNOTATION_POINTER_MOVE") {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const container = canvas.parentElement || canvas;
        const rect = container.getBoundingClientRect();
        const { nx, ny } = message;

        setRemotePointerPos({
          x: nx * rect.width,
          y: ny * rect.height,
        });
      } else if (t === "ANNOTATION_POINTER_HIDE") {
        setRemotePointerPos(null);
      }

      // NOTES
      else if (t === "ANNOTATION_NOTE_CREATE") {
        const { id, x, y, text = "" } = message;
        if (!id) return;
        setStickyNotes((prev) => {
          if (prev.some((n) => n.id === id)) return prev;
          const next = [...prev, { id, x, y, text }];
          saveAnnotations({ stickyNotes: next });
          return next;
        });
      } else if (t === "ANNOTATION_NOTE_UPDATE") {
        const { id, text = "" } = message;
        if (!id) return;
        setStickyNotes((prev) => {
          const next = prev.map((n) => (n.id === id ? { ...n, text } : n));
          saveAnnotations({ stickyNotes: next });
          return next;
        });
      } else if (t === "ANNOTATION_NOTE_MOVE") {
        const { id, x, y } = message;
        if (!id) return;
        setStickyNotes((prev) => {
          const next = prev.map((n) => (n.id === id ? { ...n, x, y } : n));
          saveAnnotations({ stickyNotes: next });
          return next;
        });
      } else if (t === "ANNOTATION_NOTE_DELETE") {
        const { id } = message;
        if (!id) return;
        setStickyNotes((prev) => {
          const next = prev.filter((n) => n.id !== id);
          saveAnnotations({ stickyNotes: next });
          return next;
        });
      }

      // TEXT BOXES
      else if (t === "ANNOTATION_TEXT_CREATE") {
        const { id, x, y, text = "", color = PEN_COLORS[0] } = message;
        if (!id) return;
        setTextBoxes((prev) => {
          if (prev.some((b) => b.id === id)) return prev;
          const next = [...prev, { id, x, y, text, color }];
          saveAnnotations({ textBoxes: next });
          return next;
        });
      } else if (t === "ANNOTATION_TEXT_UPDATE") {
        const { id, text = "" } = message;
        if (!id) return;
        setTextBoxes((prev) => {
          const next = prev.map((b) => (b.id === id ? { ...b, text } : b));
          saveAnnotations({ textBoxes: next });
          return next;
        });
      } else if (t === "ANNOTATION_TEXT_MOVE") {
        const { id, x, y } = message;
        if (!id) return;
        setTextBoxes((prev) => {
          const next = prev.map((b) => (b.id === id ? { ...b, x, y } : b));
          saveAnnotations({ textBoxes: next });
          return next;
        });
      } else if (t === "ANNOTATION_TEXT_DELETE") {
        const { id } = message;
        if (!id) return;
        setTextBoxes((prev) => {
          const next = prev.filter((b) => b.id !== id);
          saveAnnotations({ textBoxes: next });
          return next;
        });
      }

      // CLEAR ALL
      else if (t === "ANNOTATION_CLEAR_ALL") {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setStickyNotes([]);
        setTextBoxes([]);
        setRemotePointerPos(null);
        saveAnnotations({ canvasData: null, stickyNotes: [], textBoxes: [] });
      }
    });

    return unsubscribe;
  }, [channelSubscribe]);

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

    if (channelReady && channelSend) {
      channelSend({
        type: "ANNOTATION_NOTE_CREATE",
        id: note.id,
        x: note.x,
        y: note.y,
        text: note.text,
      });
    }

    setTool(TOOL_NONE);
  }

  function updateNoteText(id, text) {
    const next = stickyNotes.map((n) => (n.id === id ? { ...n, text } : n));
    setStickyNotes(next);
    saveAnnotations({ stickyNotes: next });

    if (channelReady && channelSend) {
      channelSend({
        type: "ANNOTATION_NOTE_UPDATE",
        id,
        text,
      });
    }
  }

  function deleteNote(id) {
    const next = stickyNotes.filter((n) => n.id !== id);
    setStickyNotes(next);
    saveAnnotations({ stickyNotes: next });

    if (channelReady && channelSend) {
      channelSend({
        type: "ANNOTATION_NOTE_DELETE",
        id,
      });
    }
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

    if (channelReady && channelSend) {
      channelSend({
        type: "ANNOTATION_TEXT_CREATE",
        id: box.id,
        x: box.x,
        y: box.y,
        text: box.text,
        color: box.color,
      });
    }
  }

  function updateTextBoxText(id, text) {
    const next = textBoxes.map((t) => (t.id === id ? { ...t, text } : t));
    setTextBoxes(next);
    saveAnnotations({ textBoxes: next });

    if (channelReady && channelSend) {
      channelSend({
        type: "ANNOTATION_TEXT_UPDATE",
        id,
        text,
      });
    }
  }

  function deleteTextBox(id) {
    const next = textBoxes.filter((t) => t.id !== id);
    setTextBoxes(next);
    saveAnnotations({ textBoxes: next });
    if (activeTextId === id) setActiveTextId(null);

    if (channelReady && channelSend) {
      channelSend({
        type: "ANNOTATION_TEXT_DELETE",
        id,
      });
    }
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
    setPointerPos(null);
    setRemotePointerPos(null);

    saveAnnotations({ canvasData: null, stickyNotes: [], textBoxes: [] });

    if (channelReady && channelSend) {
      channelSend({ type: "ANNOTATION_CLEAR_ALL" });
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
      if (channelReady && channelSend && nextTool === TOOL_POINTER) {
        channelSend({ type: "ANNOTATION_POINTER_HIDE" });
      }
    } else {
      setTool(nextTool);
      if (nextTool !== TOOL_POINTER) {
        setPointerPos(null);
        if (channelReady && channelSend) {
          channelSend({ type: "ANNOTATION_POINTER_HIDE" });
        }
      }
    }
  }

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

        {/* Local pointer arrow */}
        {tool === TOOL_POINTER && pointerPos && (
          <div
            className="prep-pointer"
            style={{
              left: `${pointerPos.x}px`,
              top: `${pointerPos.y}px`,
            }}
          />
        )}

        {/* Remote pointer arrow */}
        {remotePointerPos && (
          <div
            className="prep-pointer prep-pointer--remote"
            style={{
              left: `${remotePointerPos.x}px`,
              top: `${remotePointerPos.y}px`,
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
                  // PDF + sidebar (pdf.js) – overlay INSIDE the PDF scroller
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
                  <div className="prep-viewer__canvas-container">
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
