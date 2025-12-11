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
  // SAFETY GUARD
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
  const [pointer, setPointer] = useState(null); // { x,y } normalized
  const [stickyNotes, setStickyNotes] = useState([]);
  const [textBoxes, setTextBoxes] = useState([]);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [dragState, setDragState] = useState(null); // { kind: "note"|"text", id, offsetX, offsetY }
  const [activeTextId, setActiveTextId] = useState(null);
  const [pdfFallback, setPdfFallback] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Vector strokes using normalized coords
  // stroke: { id, tool, color, points: [{ x,y } in [0,1]] }
  const [strokes, setStrokes] = useState([]);
  const [currentStrokeId, setCurrentStrokeId] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null); // element that matches the page (for normalized coords)
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
  // PDF detection - comprehensive check using multiple signals
  // ─────────────────────────────────────────────────────────────
  // Use pdf.js unless we've hit a fatal error and decided to fall back
  // ─────────────────────────────────────────────────────────────
  // PDF detection – trust viewerHelpers + proxy
  // ─────────────────────────────────────────────────────────────
  console.log("DEBUG viewerUrl:", viewerUrl);
  const isPdf = viewer?.type === "pdf";

  // For PDFs we use the viewerUrl coming from getViewerInfo (already proxied)
  const pdfViewerUrl = isPdf ? viewerUrl : null;

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
  // Utility: normalized point relative to containerRef
  // ─────────────────────────────────────────────────────────────

  function getNormalizedPoint(event) {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    return {
      x: Math.min(0.999, Math.max(0.001, x)),
      y: Math.min(0.999, Math.max(0.001, y)),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Canvas coordinate helpers (for dragging notes/text)
  // ─────────────────────────────────────────────────────────────

  function getCanvasCoordinates(event) {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container && !canvas) return null;

    const el = container || canvas;
    const rect = el.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // REDRAW: render all strokes (normalized) onto canvas (legacy bitmap)
  // ─────────────────────────────────────────────────────────────

  function redrawCanvasFromStrokes(strokesToDraw) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;

    strokesToDraw.forEach((stroke) => {
      if (!stroke.points || stroke.points.length < 2) return;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === TOOL_PEN) {
        ctx.strokeStyle = stroke.color || penColor;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      } else if (stroke.tool === TOOL_HIGHLIGHTER) {
        ctx.strokeStyle = "rgba(250, 224, 120, 0.3)";
        ctx.lineWidth = 18;
        ctx.globalAlpha = 0.3;
        ctx.globalCompositeOperation = "source-over";
      } else if (stroke.tool === TOOL_ERASER) {
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = 20;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "destination-out";
      }

      ctx.beginPath();
      stroke.points.forEach((p, idx) => {
        const x = p.x * width;
        const y = p.y * height;
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.restore();
    });
  }

  // Whenever strokes change, redraw bitmap (for saving/broadcast)
  useEffect(() => {
    redrawCanvasFromStrokes(strokes);
  }, [strokes]);

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
      if (Array.isArray(parsed.strokes)) {
        setStrokes(parsed.strokes);
      } else if (parsed.canvasData && canvasRef.current) {
        // Legacy fallback: old saved raster image
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
  // Resize canvas with container (and redraw strokes)
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

      canvas.width = rect.width;
      canvas.height = rect.height;

      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      redrawCanvasFromStrokes(strokes);
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
  }, [hasScreenShare, strokes]);

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
        canvasData: canvasData || null, // legacy/fallback
        strokes: opts.strokes ?? strokes,
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
      canvasData: canvasData || null, // legacy
      strokes: custom.strokes ?? strokes,
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
      strokes: remoteStrokes,
      stickyNotes: remoteNotes,
      textBoxes: remoteText,
    } = message;

    applyingRemoteRef.current = true;
    try {
      if (Array.isArray(remoteNotes)) setStickyNotes(remoteNotes);
      if (Array.isArray(remoteText)) setTextBoxes(remoteText);
      if (Array.isArray(remoteStrokes)) {
        setStrokes(remoteStrokes);
        // redraw handled by useEffect
      } else if (canvasData && canvasRef.current) {
        // legacy image path
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
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

      saveAnnotations({
        canvasData: canvasData || null,
        strokes: Array.isArray(remoteStrokes) ? remoteStrokes : strokes,
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
        setPointer({ x: msg.xNorm, y: msg.yNorm });
      } else if (msg.type === "POINTER_HIDE") {
        setPointer(null);
      }
    });

    return unsubscribe;
  }, [classroomChannel, resource._id]);

  // ─────────────────────────────────────────────────────────────
  // Drawing tools (pen / highlighter / eraser) using normalized coords
  // ─────────────────────────────────────────────────────────────

  function startDrawing(e) {
    if (tool !== TOOL_PEN && tool !== TOOL_HIGHLIGHTER && tool !== TOOL_ERASER)
      return;

    const p = getNormalizedPoint(e);
    if (!p) return;

    const id = `stroke_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const stroke = {
      id,
      tool,
      color: penColor,
      points: [p],
    };

    setStrokes((prev) => [...prev, stroke]);
    setCurrentStrokeId(id);
    setIsDrawing(true);
  }

  function draw(e) {
    // Dragging sticky notes / text boxes
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

    if (!isDrawing) return;

    if (tool !== TOOL_PEN && tool !== TOOL_HIGHLIGHTER && tool !== TOOL_ERASER)
      return;

    if (!currentStrokeId) return;

    const p = getNormalizedPoint(e);
    if (!p) return;

    setStrokes((prev) =>
      prev.map((stroke) =>
        stroke.id === currentStrokeId
          ? { ...stroke, points: [...stroke.points, p] }
          : stroke
      )
    );
  }

  function stopDrawing() {
    if (!isDrawing && !dragState) return;
    setIsDrawing(false);
    setCurrentStrokeId(null);

    saveAnnotations();
    broadcastAnnotations();

    if (dragState) {
      setDragState(null);
      saveAnnotations();
      broadcastAnnotations();
    }
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
    const p = getNormalizedPoint(e);
    if (!p) return;

    const box = {
      id: `text_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      x: p.x,
      y: p.y,
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
    setStrokes([]);
    setStickyNotes([]);
    setTextBoxes([]);
    setDragState(null);
    setActiveTextId(null);
    setPointer(null);
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          canvasData: null,
          strokes: [],
          stickyNotes: [],
          textBoxes: [],
        })
      );
    } catch (err) {
      console.warn("Failed to clear annotations", err);
    }
    broadcastAnnotations({
      canvasData: null,
      strokes: [],
      stickyNotes: [],
      textBoxes: [],
    });
    broadcastPointer(null);
  }

  // ─────────────────────────────────────────────────────────────
  // Mouse handlers (attached to canvas)
  // ─────────────────────────────────────────────────────────────

  function handleMouseDown(e) {
    const target = e.target;
    if (
      target.closest &&
      (target.closest(".prep-sticky-note") || target.closest(".prep-text-box"))
    ) {
      // Note/text header handles its own drag start
      return;
    }

    // Pointer: click-to-stick (normalized)
    if (tool === TOOL_POINTER) {
      e.preventDefault();
      const p = getNormalizedPoint(e);
      if (!p) return;
      setPointer(p);
      broadcastPointer(p);
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
  // Tool switching helper (toggling)
  // ─────────────────────────────────────────────────────────────

  function setToolSafe(nextTool) {
    if (tool === nextTool) {
      setTool(TOOL_NONE);
      setPointer(null);
      broadcastPointer(null);
    } else {
      setTool(nextTool);
      if (nextTool !== TOOL_POINTER) {
        setPointer(null);
        broadcastPointer(null);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Render overlay (canvas + SVG + notes + text + pointer)
  // ─────────────────────────────────────────────────────────────

  function renderAnnotationsOverlay() {
    // Key fix: Enable the overlay only when needed for interaction
    // (drawing tools active OR existing notes/text that can be dragged/edited)
    const needsInteraction =
      tool !== TOOL_NONE || stickyNotes.length > 0 || textBoxes.length > 0;
    const overlayPointerEvents = needsInteraction ? "auto" : "none";
    const overlayTouchAction = needsInteraction ? "none" : "auto";

    return (
      <div
        className="prep-annotate-layer"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: overlayPointerEvents,
          touchAction: overlayTouchAction,
        }}
      >
        {/* Canvas for drawing (gets mouse events) */}
        <canvas
          ref={canvasRef}
          className={
            "prep-annotate-canvas" +
            (tool !== TOOL_NONE ? " prep-annotate-canvas--drawing" : "")
          }
          style={{
            width: "100%",
            height: "100%",
            pointerEvents: tool === TOOL_NONE ? "none" : "auto",
            touchAction: tool === TOOL_NONE ? "auto" : "none",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* SVG layer renders normalized strokes (auto-scales) */}
        <svg
          className="annotation-svg-layer"
          width="100%"
          height="100%"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          {strokes.map((stroke) => (
            <polyline
              key={stroke.id}
              points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={
                stroke.tool === TOOL_HIGHLIGHTER
                  ? "rgba(255,255,0,0.5)"
                  : stroke.color || "#111"
              }
              strokeWidth={
                stroke.tool === TOOL_HIGHLIGHTER ? 0.04 : 0.01 // normalized widths
              }
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        {/* Text boxes layer (normalized) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          {textBoxes.map((box) => {
            const isEditing = activeTextId === box.id;
            return (
              <div
                key={box.id}
                className={
                  "prep-text-box" + (isEditing ? " prep-text-box--editing" : "")
                }
                style={{
                  position: "absolute",
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "auto", // to allow drag/edit
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
                      placeholder={t(dict, "resources_prep_text_placeholder")}
                      value={box.text}
                      onChange={(e) =>
                        updateTextBoxText(box.id, e.target.value)
                      }
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
        </div>

        {/* Sticky notes */}
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

        {/* Pointer (normalized) */}
        {pointer && (
          <div
            className="prep-pointer"
            style={{
              position: "absolute",
              left: `${pointer.x * 100}%`,
              top: `${pointer.y * 100}%`,
              transform: "translate(-50%, -50%)",
              width: 16,
              height: 16,
              borderRadius: "999px",
              border: "2px solid #ef4444",
              background: "rgba(239,68,68,0.3)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
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
                {/* SCREEN SHARE MODE */}
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
                  // PDF MODE
                  <div className="prep-viewer__canvas-container">
                    <PdfViewerWithSidebar
                      fileUrl={pdfViewerUrl}
                      onFatalError={(err) => {
                        console.error("PDF failed to load in pdf.js", err);
                        // We do NOT fall back to iframe viewer – no embedded Google.
                      }}
                      onContainerReady={(el) => {
                        // el is the page wrapper that matches the PDF page
                        containerRef.current = el;
                      }}
                      // Always show PDF controls + page sidebar,
                      // even if breadcrumbs are hidden.
                      hideControls={false}
                      hideSidebar={false}
                      locale={locale}
                    >
                      {renderAnnotationsOverlay()}
                    </PdfViewerWithSidebar>
                  </div>
                ) : (
                  // IFRAME MODE (Google viewer, etc.)
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
