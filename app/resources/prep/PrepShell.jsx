// app/resources/prep/PrepShell.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PrepNotes from "./PrepNotes";
import PdfViewerWithSidebar from "./PdfViewerWithSidebar";
import { getDictionary, t } from "@/app/i18n";

const TOOL_NONE = "none";
const TOOL_PEN = "pen";
const TOOL_HIGHLIGHTER = "highlighter";
const TOOL_NOTE = "note";
const TOOL_POINTER = "pointer";
const TOOL_ERASER = "eraser";
const TOOL_TEXT = "text";

const PEN_COLORS = [
  "#000000",
  "#f9fafb",
  "#fbbf24",
  "#60a5fa",
  "#f97316",
  "#22c55e",
];

// ─────────────────────────────────────────────────────────────
// HELPER: Detect and convert Google Drive URLs
// ─────────────────────────────────────────────────────────────

function parseGoogleDriveUrl(url) {
  if (!url) return null;

  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

function getDirectPdfUrl(url) {
  if (!url) return null;

  const fileId = parseGoogleDriveUrl(url);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return url;
}

function isGoogleDriveUrl(url) {
  if (!url) return false;
  return url.includes("drive.google.com") || url.includes("docs.google.com");
}

function isPdfUrl(url) {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.endsWith(".pdf") ||
    lowerUrl.includes(".pdf?") ||
    lowerUrl.includes("/pdf") ||
    isGoogleDriveUrl(url)
  );
}

export default function PrepShell({
  resource,
  viewer,
  hideSidebar = false,
  hideBreadcrumbs = false,
  classroomChannel,
  isScreenShareActive = false,
  isTeacher = false,
  locale = "en",
  unitIdFromQuery,
}) {
  const dict = getDictionary(locale, "resources");

  // ─────────────────────────────────────────────────────────────
  // SAFETY GUARD: if there is no resource, don't explode
  // ─────────────────────────────────────────────────────────────
  if (!resource) {
    return (
      <div className="prep-empty-card">
        <h2 className="prep-empty-card__title">
          {t(dict, "resources_prep_empty_title")}
        </h2>
        <p className="prep-empty-card__text">
          {t(dict, "resources_prep_empty_text")}
        </p>
      </div>
    );
  }

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const screenVideoRef = useRef(null);

  const applyingRemoteRef = useRef(false);

  const storageKey = `prep_annotations_${resource._id}`;

  const viewerUrl = viewer?.viewerUrl || null;
  const unit = resource.unit;
  const subLevel = unit?.subLevel;
  const level = subLevel?.level;
  const track = level?.track;

  const hasScreenShare = !!isScreenShareActive;

  // ─────────────────────────────────────────────────────────────
  // PDF detection
  // ─────────────────────────────────────────────────────────────
  const isPdf = (() => {
    if (pdfFallback) return false;
    if (viewer?.type === "pdf") return true;
    if (isPdfUrl(viewerUrl)) return true;
    if (resource.fileName?.toLowerCase().endsWith(".pdf")) return true;
    if (resource.sourceType?.toLowerCase() === "pdf") return true;
    return false;
  })();

  const pdfViewerUrl = isPdf ? getDirectPdfUrl(viewerUrl) : null;

  const showSidebar = !hideSidebar && !sidebarCollapsed;
  const showBreadcrumbs = !hideBreadcrumbs;

  const channelReady = !!classroomChannel?.ready;
  const sendOnChannel = classroomChannel?.send;

  const layoutClasses =
    "prep-layout" +
    (focusMode || sidebarCollapsed || hideSidebar ? " prep-layout--focus" : "");

  // ─────────────────────────────────────────────────────────────
  // Focus newly-activated text box
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeTextId) return;
    const el = document.querySelector(`[data-textbox-id="${activeTextId}"]`);
    if (el) el.focus();
  }, [activeTextId]);

  // ─────────────────────────────────────────────────────────────
  // Load annotations from localStorage
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

  // ─────────────────────────────────────────────────────────────
  // Resize canvas with container
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;

    function getContainer() {
      if (containerRef.current) return containerRef.current;
      if (!canvasRef.current) return null;
      return canvasRef.current.parentElement || canvasRef.current;
    }

    const container = getContainer();
    if (!container || !canvas) return;

    function resizeCanvas() {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const prev =
        canvas.width && canvas.height ? canvas.toDataURL("image/png") : null;

      canvas.width = rect.width;
      canvas.height = rect.height;

      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

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
  }, [hasScreenShare]);

  // ─────────────────────────────────────────────────────────────
  // Persistence + broadcasting
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
        textBoxes: opts.textBoxes ?? textBoxes,
      };

      window.localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn("Failed to save annotations", err);
    }
  }

  function broadcastAnnotations(custom = {}) {
    if (!channelReady || !sendOnChannel) return;
    if (applyingRemoteRef.current) return;

    const canvas = canvasRef.current;
    const canvasData =
      custom.canvasData ?? (canvas ? canvas.toDataURL("image/png") : null);

    const payload = {
      type: "ANNOTATION_STATE",
      resourceId: resource._id,
      canvasData: canvasData || null,
      stickyNotes: custom.stickyNotes ?? stickyNotes,
      textBoxes: custom.textBoxes ?? textBoxes,
    };

    try {
      sendOnChannel(payload);
    } catch (err) {
      console.warn("Failed to broadcast annotations", err);
    }
  }

  function broadcastPointer(normalizedPosOrNull) {
    if (!channelReady || !sendOnChannel) return;
    if (applyingRemoteRef.current) return;

    if (!normalizedPosOrNull) {
      sendOnChannel({ type: "POINTER_HIDE", resourceId: resource._id });
      return;
    }

    const { x, y } = normalizedPosOrNull;
    sendOnChannel({
      type: "POINTER_MOVE",
      resourceId: resource._id,
      xNorm: x,
      yNorm: y,
    });
  }

  function applyRemoteAnnotationState(message) {
    if (!message || message.resourceId !== resource._id) return;

    const {
      canvasData,
      stickyNotes: remoteNotes,
      textBoxes: remoteText,
    } = message;

    applyingRemoteRef.current = true;
    try {
      if (Array.isArray(remoteNotes)) setStickyNotes(remoteNotes);
      if (Array.isArray(remoteText)) setTextBoxes(remoteText);

      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (canvasData) {
            const img = new Image();
            img.onload = () => {
              const c = canvasRef.current;
              if (!c) return;
              const context = c.getContext("2d");
              if (!context) return;
              context.clearRect(0, 0, c.width, c.height);
              context.drawImage(img, 0, 0, c.width, c.height);
            };
            img.src = canvasData;
          }
        }
      }

      saveAnnotations({
        canvasData: canvasData || null,
        stickyNotes: Array.isArray(remoteNotes) ? remoteNotes : stickyNotes,
        textBoxes: Array.isArray(remoteText) ? remoteText : textBoxes,
      });
    } finally {
      applyingRemoteRef.current = false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Subscribe to classroom channel (for sync)
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!classroomChannel || !classroomChannel.ready) return;
    if (!classroomChannel.subscribe) return;

    const unsubscribe = classroomChannel.subscribe((msg) => {
      if (!msg || msg.resourceId !== resource._id) return;

      if (msg.type === "ANNOTATION_STATE") {
        applyRemoteAnnotationState(msg);
      } else if (msg.type === "POINTER_MOVE") {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = msg.xNorm * rect.width;
        const y = msg.yNorm * rect.height;
        setPointerPos({ x, y });
      } else if (msg.type === "POINTER_HIDE") {
        setPointerPos(null);
      }
    });

    return unsubscribe;
  }, [classroomChannel, resource._id]);

  // ─────────────────────────────────────────────────────────────
  // Canvas coordinate helpers
  // ─────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────
  // Drawing tools (pen / highlighter / eraser)
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
          broadcastAnnotations({ stickyNotes: updated });
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
          broadcastAnnotations({ textBoxes: updated });
          return updated;
        });
      }
      return;
    }

    if (!isDrawing) {
      if (tool === TOOL_POINTER) updatePointer(e);
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
    broadcastAnnotations();
  }

  // ─────────────────────────────────────────────────────────────
  // Pointer mode
  // ─────────────────────────────────────────────────────────────

  function updatePointer(e) {
    if (tool !== TOOL_POINTER) {
      setPointerPos(null);
      broadcastPointer(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPointerPos({ x, y });
    broadcastPointer({
      x: rect.width ? x / rect.width : 0,
      y: rect.height ? y / rect.height : 0,
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
    broadcastAnnotations({ stickyNotes: nextNotes });
    setTool(TOOL_NONE);
  }

  function updateNoteText(id, text) {
    const next = stickyNotes.map((n) => (n.id === id ? { ...n, text } : n));
    setStickyNotes(next);
    saveAnnotations({ stickyNotes: next });
    broadcastAnnotations({ stickyNotes: next });
  }

  function deleteNote(id) {
    const next = stickyNotes.filter((n) => n.id !== id);
    setStickyNotes(next);
    saveAnnotations({ stickyNotes: next });
    broadcastAnnotations({ stickyNotes: next });
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
  // Text boxes
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
    broadcastAnnotations({ textBoxes: next });
  }

  function updateTextBoxText(id, text) {
    const next = textBoxes.map((t) => (t.id === id ? { ...t, text } : t));
    setTextBoxes(next);
    saveAnnotations({ textBoxes: next });
    broadcastAnnotations({ textBoxes: next });
  }

  function deleteTextBox(id) {
    const next = textBoxes.filter((t) => t.id !== id);
    setTextBoxes(next);
    saveAnnotations({ textBoxes: next });
    broadcastAnnotations({ textBoxes: next });
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
  // Clear everything
  // ─────────────────────────────────────────────────────────────

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
    broadcastAnnotations({ canvasData: null, stickyNotes: [], textBoxes: [] });
  }

  // ─────────────────────────────────────────────────────────────
  // Mouse handlers for overlay
  // ─────────────────────────────────────────────────────────────

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
    } else if (pointerPos) {
      setPointerPos(null);
      broadcastPointer(null);
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
      broadcastAnnotations();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Tool switching helper (toggling)
  // ─────────────────────────────────────────────────────────────

  function setToolSafe(nextTool) {
    if (tool === nextTool) {
      setTool(TOOL_NONE);
      setPointerPos(null);
      broadcastPointer(null);
    } else {
      setTool(nextTool);
      if (nextTool !== TOOL_POINTER) {
        setPointerPos(null);
        broadcastPointer(null);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Render overlay (canvas + notes + text + pointer)
  // ─────────────────────────────────────────────────────────────

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

        {stickyNotes.map((note) => (
          <div
            key={note.id}
            className="prep-sticky-note"
            style={{ left: `${note.x * 100}%`, top: `${note.y * 100}%` }}
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
              placeholder={t(dict, "resources_prep_note_placeholder")}
              value={note.text}
              onChange={(e) => updateNoteText(note.id, e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        ))}

        {textBoxes.map((box) => {
          const isEditing = activeTextId === box.id;
          return (
            <div
              key={box.id}
              className={
                "prep-text-box" + (isEditing ? " prep-text-box--editing" : "")
              }
              style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%` }}
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
                    placeholder={t(dict, "resources_prep_text_placeholder")}
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

        {pointerPos && (
          <div
            className="prep-pointer"
            style={{ left: `${pointerPos.x}px`, top: `${pointerPos.y}px` }}
          />
        )}
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Viewer activity flag
  // ─────────────────────────────────────────────────────────────

  const viewerIsActive = hasScreenShare || !!viewerUrl;

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <>
      {showBreadcrumbs && (
        <nav className="unit-breadcrumbs prep-breadcrumbs">
          <Link href="/resources" className="unit-breadcrumbs__link">
            {t(dict, "resources_breadcrumb_root")}
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
            {t(dict, "resources_breadcrumb_prep_room")}
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
                {t(dict, "resources_prep_info_back_to_picker")}
              </Link>
              {unit?.slug && (
                <Link
                  href={`/resources/units/${unit.slug}`}
                  className="resources-button resources-button--ghost"
                >
                  {t(dict, "resources_prep_info_view_unit")}
                </Link>
              )}
              {viewer?.rawUrl && (
                <a
                  href={viewer.rawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resources-button resources-button--primary"
                >
                  {t(dict, "resources_prep_info_open_raw")}
                </a>
              )}
            </div>

            {/* 🔴 IMPORTANT: pass locale down so PrepNotes uses Arabic when /ar/... */}
            <PrepNotes resourceId={resource._id} locale={locale} />
          </aside>
        )}

        <section className="prep-viewer">
          {viewerIsActive && !hideBreadcrumbs && (
            <button
              type="button"
              className="prep-viewer__focus-toggle"
              onClick={() => setFocusMode((v) => !v)}
            >
              {focusMode
                ? t(dict, "resources_focus_viewer_exit")
                : t(dict, "resources_focus_viewer_enter")}
            </button>
          )}

          {viewerIsActive ? (
            <>
              {/* Toolbar */}
              <div className="prep-annotate-toolbar">
                {/* Sidebar toggle */}
                {!hideSidebar && (
                  <button
                    type="button"
                    className={
                      "prep-annotate-toolbar__btn prep-annotate-toolbar__btn--sidebar" +
                      (sidebarCollapsed ? " is-collapsed" : "")
                    }
                    onClick={() => setSidebarCollapsed((v) => !v)}
                    aria-label={
                      sidebarCollapsed
                        ? t(dict, "resources_toolbar_sidebar_show")
                        : t(dict, "resources_toolbar_sidebar_hide")
                    }
                  >
                    {sidebarCollapsed ? "📋" : "📋"}
                    <span>
                      {sidebarCollapsed
                        ? t(dict, "resources_toolbar_sidebar_show")
                        : t(dict, "resources_toolbar_sidebar_hide")}
                    </span>
                  </button>
                )}

                <div className="prep-annotate-toolbar__separator" />

                <button
                  type="button"
                  className={
                    "prep-annotate-toolbar__btn" +
                    (tool === TOOL_PEN ? " is-active" : "")
                  }
                  onClick={() => setToolSafe(TOOL_PEN)}
                >
                  🖊️ <span>{t(dict, "resources_toolbar_pen")}</span>
                </button>
                <button
                  type="button"
                  className={
                    "prep-annotate-toolbar__btn" +
                    (tool === TOOL_HIGHLIGHTER ? " is-active" : "")
                  }
                  onClick={() => setToolSafe(TOOL_HIGHLIGHTER)}
                >
                  ✨ <span>{t(dict, "resources_toolbar_highlighter")}</span>
                </button>
                <button
                  type="button"
                  className={
                    "prep-annotate-toolbar__btn" +
                    (tool === TOOL_TEXT ? " is-active" : "")
                  }
                  onClick={() => setToolSafe(TOOL_TEXT)}
                >
                  ✍️ <span>{t(dict, "resources_toolbar_text")}</span>
                </button>
                <button
                  type="button"
                  className={
                    "prep-annotate-toolbar__btn" +
                    (tool === TOOL_ERASER ? " is-active" : "")
                  }
                  onClick={() => setToolSafe(TOOL_ERASER)}
                >
                  🧽 <span>{t(dict, "resources_toolbar_eraser")}</span>
                </button>
                <button
                  type="button"
                  className={
                    "prep-annotate-toolbar__btn" +
                    (tool === TOOL_NOTE ? " is-active" : "")
                  }
                  onClick={() => setToolSafe(TOOL_NOTE)}
                >
                  🗒️ <span>{t(dict, "resources_toolbar_note")}</span>
                </button>
                <button
                  type="button"
                  className={
                    "prep-annotate-toolbar__btn" +
                    (tool === TOOL_POINTER ? " is-active" : "")
                  }
                  onClick={() => setToolSafe(TOOL_POINTER)}
                >
                  ➤ <span>{t(dict, "resources_toolbar_pointer")}</span>
                </button>
                <button
                  type="button"
                  className="prep-annotate-toolbar__btn prep-annotate-toolbar__btn--danger"
                  onClick={clearCanvasAndNotes}
                >
                  🗑️ <span>{t(dict, "resources_toolbar_clear_all")}</span>
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
                {/* 🔥 SCREEN SHARE MODE */}
                {hasScreenShare ? (
                  <div
                    className="prep-viewer__canvas-container"
                    ref={containerRef}
                  >
                    <video
                      ref={screenVideoRef}
                      className="prep-viewer__frame prep-viewer__frame--screen-share"
                      playsInline
                      autoPlay
                    />
                    {renderAnnotationsOverlay()}
                  </div>
                ) : isPdf ? (
                  /* 🔥 PDF MODE */
                  <div className="prep-viewer__canvas-container">
                    <PdfViewerWithSidebar
                      fileUrl={pdfViewerUrl}
                      onFatalError={() => setPdfFallback(true)}
                      onContainerReady={(el) => {
                        containerRef.current = el;
                      }}
                      hideControls={!hideBreadcrumbs ? false : true}
                      hideSidebar={hideBreadcrumbs}
                      locale={locale}
                    >
                      {renderAnnotationsOverlay()}
                    </PdfViewerWithSidebar>
                  </div>
                ) : (
                  /* 🔥 IFRAME MODE */
                  <div
                    className="prep-viewer__canvas-container"
                    ref={containerRef}
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
              <h2>{t(dict, "resources_viewer_no_preview_title")}</h2>
              <p>{t(dict, "resources_viewer_no_preview_text")}</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
