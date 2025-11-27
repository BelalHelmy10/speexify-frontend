// app/resources/prep/PrepShell.jsx
"use client";

import { useEffect, useRef, useState, useRef as useRefAlias } from "react";
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

export default function PrepShell({
  resource,
  viewer,
  hideSidebar = false,
  hideBreadcrumbs = false,
  classroomChannel = null, // 🔥 optional shared channel
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
  const [pdfFallback, setPdfFallback] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Remote drawing state (for strokes coming from the other peer)
  const remoteDrawRef = useRef({
    isDrawing: false,
    tool: null,
    color: "#000000",
    last: null, // { nx, ny }
  });

  const storageKey = `prep_annotations_${resource._id}`;

  const viewerUrl = viewer?.viewerUrl || null;
  const unit = resource.unit;
  const subLevel = unit?.subLevel;
  const level = subLevel?.level;
  const track = level?.track;
  const viewerActive = !!viewerUrl;
  const isPdf = viewer?.type === "pdf" && !pdfFallback;

  const showSidebar = !hideSidebar;
  const showBreadcrumbs = !hideBreadcrumbs;

  const layoutClasses =
    "prep-layout" +
    (focusMode ? " prep-layout--focus" : "") +
    (hideSidebar ? " prep-layout--no-sidebar" : "");

  const hasChannel = !!classroomChannel;

  /* ------------------------------------------------------------------ */
  /* Focus newly-activated text box                                     */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!activeTextId) return;
    const el = document.querySelector(`[data-textbox-id="${activeTextId}"]`);
    if (el) el.focus();
  }, [activeTextId]);

  /* ------------------------------------------------------------------ */
  /* Load annotations from localStorage                                 */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* Resize annotation canvas to match container                        */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    function resizeCanvas() {
      const rect = container.getBoundingClientRect();
      const prevData = canvas.toDataURL("image/png");

      canvas.width = rect.width;
      canvas.height = rect.height;

      if (prevData) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = prevData;
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

  /* ------------------------------------------------------------------ */
  /* Save annotations (canvas + notes + text)                           */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* Geometry helper – normalized within the viewer container           */
  /* ------------------------------------------------------------------ */
  function getCanvasCoordinates(event) {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function normFromCoords({ x, y, width, height }) {
    return {
      nx: width ? x / width : 0,
      ny: height ? y / height : 0,
    };
  }

  function coordsFromNorm(nx, ny) {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    return {
      x: nx * rect.width,
      y: ny * rect.height,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Helper: draw a stroke segment (local OR remote)                    */
  /* ------------------------------------------------------------------ */
  function drawStrokeSegment(x1, y1, x2, y2, strokeTool, color) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (strokeTool === TOOL_PEN) {
      ctx.strokeStyle = color;
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
    } else {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /* ------------------------------------------------------------------ */
  /* Drawing (local)                                                    */
  /* ------------------------------------------------------------------ */
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

    // Broadcast START
    if (hasChannel && classroomChannel.ready) {
      const { nx, ny } = normFromCoords(coords);
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
    // dragging text boxes (local)
    if (dragState) {
      const coords = getCanvasCoordinates(e);
      if (!coords) return;
      const { width, height, x, y } = coords;

      if (dragState.kind === "text") {
        setTextBoxes((prev) => {
          const updated = prev.map((t) => {
            if (t.id !== dragState.id) return t;
            const nx = (x + dragState.offsetX) / width;
            const ny = (y + dragState.offsetY) / height;
            const clampedX = Math.min(0.98, Math.max(0.02, nx));
            const clampedY = Math.min(0.98, Math.max(0.02, ny));
            return { ...t, x: clampedX, y: clampedY };
          });
          saveAnnotations({ textBoxes: updated });

          // Broadcast move
          if (hasChannel && classroomChannel.ready) {
            const moved = updated.find((t) => t.id === dragState.id);
            if (moved) {
              classroomChannel.send({
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

    // Broadcast MOVE
    if (hasChannel && classroomChannel.ready) {
      const { nx, ny } = normFromCoords(coords);
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

    if (hasChannel && classroomChannel.ready) {
      classroomChannel.send({
        type: "ANNOTATION_DRAW_END",
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Remote drawing (from peer)                                         */
  /* ------------------------------------------------------------------ */
  function handleRemoteDrawStart({ tool, color, nx, ny }) {
    const state = remoteDrawRef.current;
    state.isDrawing = true;
    state.tool = tool;
    state.color = color || "#000000";
    state.last = { nx, ny };
  }

  function handleRemoteDrawMove({ tool, color, nx, ny }) {
    const state = remoteDrawRef.current;
    if (!state.isDrawing || !state.last) {
      // If we somehow missed START, initialize last here
      state.last = { nx, ny };
      state.tool = tool;
      state.color = color || penColor;
      return;
    }

    const lastPx = coordsFromNorm(state.last.nx, state.last.ny);
    const currPx = coordsFromNorm(nx, ny);
    if (!lastPx || !currPx) return;

    drawStrokeSegment(
      lastPx.x,
      lastPx.y,
      currPx.x,
      currPx.y,
      tool || state.tool,
      color || state.color
    );

    state.last = { nx, ny };
  }

  function handleRemoteDrawEnd() {
    const state = remoteDrawRef.current;
    state.isDrawing = false;
    state.last = null;
    saveAnnotations();
  }

  /* ------------------------------------------------------------------ */
  /* Pointer                                                            */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* Sticky notes (local only for now)                                  */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* Text boxes (shared)                                                */
  /* ------------------------------------------------------------------ */
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

    if (hasChannel && classroomChannel.ready) {
      classroomChannel.send({
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

    if (hasChannel && classroomChannel.ready) {
      classroomChannel.send({
        type: "ANNOTATION_TEXT_UPDATE",
        id,
        text,
      });
    }
  }

  function deleteTextBox(id, fromRemote = false) {
    const next = textBoxes.filter((t) => t.id !== id);
    setTextBoxes(next);
    saveAnnotations({ textBoxes: next });
    if (activeTextId === id) setActiveTextId(null);

    if (!fromRemote && hasChannel && classroomChannel.ready) {
      classroomChannel.send({
        type: "ANNOTATION_TEXT_DELETE",
        id,
      });
    }
  }

  function startTextDrag(e, box) {
    e.stopPropagation();
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

  function handleRemoteTextCreate({ id, x, y, text, color }) {
    setTextBoxes((prev) => {
      if (prev.some((b) => b.id === id)) return prev;
      const next = [
        ...prev,
        { id, x, y, text: text || "", color: color || "#000" },
      ];
      saveAnnotations({ textBoxes: next });
      return next;
    });
  }

  function handleRemoteTextUpdate({ id, text }) {
    setTextBoxes((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, text } : b));
      saveAnnotations({ textBoxes: next });
      return next;
    });
  }

  function handleRemoteTextMove({ id, x, y }) {
    setTextBoxes((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, x, y } : b));
      saveAnnotations({ textBoxes: next });
      return next;
    });
  }

  function handleRemoteTextDelete({ id }) {
    deleteTextBox(id, true);
  }

  /* ------------------------------------------------------------------ */
  /* Clear all                                                          */
  /* ------------------------------------------------------------------ */
  function clearCanvasAndNotes(fromRemote = false) {
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

    if (!fromRemote && hasChannel && classroomChannel.ready) {
      classroomChannel.send({ type: "ANNOTATION_CLEAR_ALL" });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Mouse handlers                                                     */
  /* ------------------------------------------------------------------ */
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
      return;
    }

    if (tool === TOOL_NOTE) {
      e.preventDefault();
      handleClickForNote(e);
      return;
    }

    // Pointer / none ⇒ do nothing special (allow scroll)
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
      if (isDrawing) {
        e.preventDefault();
        draw(e);
      }
    }
  }

  function handleMouseUp() {
    stopDrawing();
    if (dragState) {
      setDragState(null);
      saveAnnotations();
    }
  }

  /* ------------------------------------------------------------------ */
  /* UI helper                                                          */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* Subscribe to classroomChannel for remote annotations               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!hasChannel) return;

    const unsubscribe = classroomChannel.subscribe((msg) => {
      switch (msg?.type) {
        case "ANNOTATION_DRAW_START":
          handleRemoteDrawStart(msg);
          break;
        case "ANNOTATION_DRAW_MOVE":
          handleRemoteDrawMove(msg);
          break;
        case "ANNOTATION_DRAW_END":
          handleRemoteDrawEnd();
          break;
        case "ANNOTATION_TEXT_CREATE":
          handleRemoteTextCreate(msg);
          break;
        case "ANNOTATION_TEXT_UPDATE":
          handleRemoteTextUpdate(msg);
          break;
        case "ANNOTATION_TEXT_MOVE":
          handleRemoteTextMove(msg);
          break;
        case "ANNOTATION_TEXT_DELETE":
          handleRemoteTextDelete(msg);
          break;
        case "ANNOTATION_CLEAR_ALL":
          clearCanvasAndNotes(true);
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, [hasChannel, classroomChannel]);

  /* ------------------------------------------------------------------ */
  /* Shared annotation overlay                                          */
  /* ------------------------------------------------------------------ */
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

        {/* Sticky notes (local only for now) */}
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

        {/* Text boxes (shared) */}
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
  }

  /* ------------------------------------------------------------------ */
  /* Render UI                                                          */
  /* ------------------------------------------------------------------ */
  return (
    <>
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
                  onClick={() => clearCanvasAndNotes(false)}
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

              <div className="prep-viewer__canvas-container" ref={containerRef}>
                {isPdf ? (
                  <PdfViewerWithSidebar
                    fileUrl={viewerUrl}
                    onFatalError={() => setPdfFallback(true)}
                  />
                ) : (
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
                )}

                {renderAnnotationsOverlay()}
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
