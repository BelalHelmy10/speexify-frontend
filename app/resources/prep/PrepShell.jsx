// app/resources/prep/PrepShell.jsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
const TOOL_MASK = "mask"; // white block to hide parts of the page

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
  const [masks, setMasks] = useState([]); // white blocks to hide content
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [dragState, setDragState] = useState(null); // { kind: "note"|"text", id, offsetX, offsetY }
  const [resizeState, setResizeState] = useState(null); // { id, startY, startFontSize }
  const [widthResizeState, setWidthResizeState] = useState(null); // { id, startX, startWidth, direction }
  const [maskDrag, setMaskDrag] = useState(null); // { mode: "creating"|"moving", ... }
  const [activeTextId, setActiveTextId] = useState(null);
  const [pdfFallback, setPdfFallback] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  // PDF page tracking for per-page annotations
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);

  const handlePdfNavStateChange = useCallback((navState) => {
    if (navState?.currentPage) {
      setPdfCurrentPage(navState.currentPage);
    }
  }, []);

  // Vector strokes using normalized coords

  // Vector strokes using normalized coords
  // stroke: { id, tool, color, points: [{ x,y } in [0,1]] }
  const [strokes, setStrokes] = useState([]);
  const [currentStrokeId, setCurrentStrokeId] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null); // element that matches the page (for normalized coords)
  const screenVideoRef = useRef(null);
  const audioRef = useRef(null);
  const toolMenuRef = useRef(null);
  const colorMenuRef = useRef(null);

  const applyingRemoteRef = useRef(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const storageKey = `prep_annotations_${resource._id}`;

  const viewerUrl = viewer?.viewerUrl || null;
  const unit = resource.unit;
  const subLevel = unit?.subLevel;
  const level = subLevel?.level;
  const track = level?.track;

  const hasScreenShare = !!isScreenShareActive;

  // PDF detection
  console.log("DEBUG viewerUrl:", viewerUrl);
  const isPdf = viewer?.type === "pdf";

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

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handleEnded = () => setIsAudioPlaying(false);

    audioEl.addEventListener("ended", handleEnded);
    audioEl.addEventListener("pause", handleEnded);

    return () => {
      audioEl.removeEventListener("ended", handleEnded);
      audioEl.removeEventListener("pause", handleEnded);
    };
  }, [resource._id]);

  // ─────────────────────────────────────────────────────────────
  // Close tool / color menus when clicking outside
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (toolMenuRef.current && !toolMenuRef.current.contains(e.target)) {
        setToolMenuOpen(false);
      }

      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target)) {
        setColorMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [toolMenuRef, colorMenuRef]);

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
      if (Array.isArray(parsed.masks)) {
        setMasks(parsed.masks);
      }
      if (Array.isArray(parsed.strokes)) {
        setStrokes(
          parsed.strokes.filter(
            (s) => s.tool === TOOL_PEN || s.tool === TOOL_HIGHLIGHTER
          )
        );
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
        masks: opts.masks ?? masks,
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
      masks: custom.masks ?? masks,
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
      masks: remoteMasks,
    } = message;

    applyingRemoteRef.current = true;
    try {
      if (Array.isArray(remoteNotes)) setStickyNotes(remoteNotes);
      if (Array.isArray(remoteText)) setTextBoxes(remoteText);
      if (Array.isArray(remoteMasks)) setMasks(remoteMasks);

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
        masks: Array.isArray(remoteMasks) ? remoteMasks : masks,
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

      // Existing sync
      if (msg.type === "ANNOTATION_STATE") {
        applyRemoteAnnotationState(msg);
        return;
      }
      if (msg.type === "POINTER_MOVE") {
        setPointer({ x: msg.xNorm, y: msg.yNorm });
        return;
      }
      if (msg.type === "POINTER_HIDE") {
        setPointer(null);
        return;
      }

      // Only learners should *react* to teacher audio commands
      if (isTeacher) return;

      const el = audioRef.current;
      if (!el) return;

      const safeSetTime = (time) => {
        if (typeof time !== "number") return;
        try {
          el.currentTime = Math.max(0, time);
        } catch (_) {}
      };

      // Helper: when we switch src (track), wait until the audio element can seek/play
      const runAfterLoad = (fn) => {
        const ready = el.readyState >= 1; // HAVE_METADATA
        if (ready) {
          fn();
          return;
        }
        const onLoaded = () => {
          el.removeEventListener("loadedmetadata", onLoaded);
          fn();
        };
        el.addEventListener("loadedmetadata", onLoaded);
      };

      if (msg.type === "AUDIO_TRACK") {
        const nextIndex = Number(msg.trackIndex) || 0;
        setCurrentTrackIndex(nextIndex);
        setIsAudioPlaying(false);

        runAfterLoad(() => {
          safeSetTime(msg.time ?? 0);

          if (msg.playing) {
            el.play().then(
              () => setIsAudioPlaying(true),
              () => setIsAudioPlaying(false)
            );
          } else {
            el.pause();
            setIsAudioPlaying(false);
          }
        });
        return;
      }

      if (msg.type === "AUDIO_PLAY") {
        runAfterLoad(() => {
          safeSetTime(msg.time);
          el.play().then(
            () => setIsAudioPlaying(true),
            () => setIsAudioPlaying(false)
          );
        });
        return;
      }

      if (msg.type === "AUDIO_PAUSE") {
        runAfterLoad(() => {
          safeSetTime(msg.time);
          el.pause();
          setIsAudioPlaying(false);
        });
        return;
      }

      if (msg.type === "AUDIO_SEEK") {
        runAfterLoad(() => {
          safeSetTime(msg.time);
        });
        return;
      }
    });

    return unsubscribe;
  }, [classroomChannel, resource._id, isTeacher]);

  // ─────────────────────────────────────────────────────────────
  // Drawing tools (pen / highlighter / eraser) using normalized coords
  // ─────────────────────────────────────────────────────────────

  function eraseAtPoint(e) {
    const p = getNormalizedPoint(e);
    if (!p) return;

    const R = 0.03; // erase radius in normalized coords

    // Erase strokes near the eraser path (only on current page for PDFs)
    setStrokes((prev) => {
      const next = prev.filter((stroke) => {
        // Skip strokes on other pages (keep them)
        if (isPdf && stroke.page && stroke.page !== pdfCurrentPage) {
          return true;
        }

        // We only erase pen & highlighter strokes
        if (stroke.tool !== TOOL_PEN && stroke.tool !== TOOL_HIGHLIGHTER) {
          return true;
        }

        const hit = stroke.points.some((pt) => {
          const dx = pt.x - p.x;
          const dy = pt.y - p.y;
          return dx * dx + dy * dy <= R * R;
        });

        // If hit, drop this stroke entirely
        return !hit;
      });

      saveAnnotations({ strokes: next });
      broadcastAnnotations({ strokes: next });
      return next;
    });

    // Erase masks (white blocks) if eraser passes through them (only on current page for PDFs)
    setMasks((prev) => {
      const next = prev.filter((m) => {
        // Skip masks on other pages (keep them)
        if (isPdf && m.page && m.page !== pdfCurrentPage) {
          return true;
        }

        const inside =
          p.x >= m.x &&
          p.x <= m.x + m.width &&
          p.y >= m.y &&
          p.y <= m.y + m.height;
        return !inside;
      });
      if (next.length !== prev.length) {
        saveAnnotations({ masks: next });
        broadcastAnnotations({ masks: next });
      }
      return next;
    });
  }

  function startDrawing(e) {
    // ERASER: start erasing, but do NOT create a stroke
    if (tool === TOOL_ERASER) {
      e.preventDefault();
      setIsDrawing(true);
      eraseAtPoint(e);
      return;
    }

    if (tool !== TOOL_PEN && tool !== TOOL_HIGHLIGHTER) return;

    const p = getNormalizedPoint(e);
    if (!p) return;

    const id = `stroke_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const stroke = {
      id,
      tool,
      color: penColor,
      points: [p],
      page: isPdf ? pdfCurrentPage : 1,
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

    // ERASER: keep erasing as we move
    if (tool === TOOL_ERASER) {
      e.preventDefault();
      eraseAtPoint(e);
      return;
    }

    if (tool !== TOOL_PEN && tool !== TOOL_HIGHLIGHTER) return;
    if (!currentStrokeId) return;

    const p = getNormalizedPoint(e);
    if (!p) return;

    setStrokes((prev) =>
      prev.map((stroke) => {
        if (stroke.id !== currentStrokeId) return stroke;

        // 🔒 Highlighter = lock Y to first point
        if (stroke.tool === TOOL_HIGHLIGHTER && stroke.points.length > 0) {
          const firstY = stroke.points[0].y;
          return {
            ...stroke,
            points: [...stroke.points, { x: p.x, y: firstY }],
          };
        }

        // ✍️ Pen = free drawing
        return {
          ...stroke,
          points: [...stroke.points, p],
        };
      })
    );
  }

  function stopDrawing() {
    if (!isDrawing && !dragState && !maskDrag) return;
    setIsDrawing(false);
    setCurrentStrokeId(null);

    saveAnnotations();
    broadcastAnnotations();

    if (dragState) {
      setDragState(null);
      saveAnnotations();
      broadcastAnnotations();
    }

    if (maskDrag) {
      setMaskDrag(null);
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
      page: isPdf ? pdfCurrentPage : 1,
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
      fontSize: 16,
      width: 150,
      page: isPdf ? pdfCurrentPage : 1,
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

  // Font size resize (bottom-right circle)
  // Font size resize (bottom-right circle) - follows diagonal movement
  function startFontSizeResize(e, box) {
    e.stopPropagation();
    e.preventDefault();
    setResizeState({
      id: box.id,
      startX: e.clientX,
      startY: e.clientY,
      startFontSize: box.fontSize || 16,
    });
  }

  function handleFontSizeResize(e) {
    if (!resizeState) return;

    const deltaX = e.clientX - resizeState.startX;
    const deltaY = e.clientY - resizeState.startY;

    // Diagonal movement: dragging toward bottom-right = bigger, top-left = smaller
    const diagonalDelta = (deltaX + deltaY) / 2;
    const newFontSize = Math.max(
      10,
      Math.min(120, resizeState.startFontSize + diagonalDelta * 0.4)
    );

    setTextBoxes((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== resizeState.id) return t;
        return { ...t, fontSize: Math.round(newFontSize) };
      });
      return updated;
    });
  }

  function stopFontSizeResize() {
    if (!resizeState) return;
    setResizeState(null);
    saveAnnotations();
    broadcastAnnotations();
  }

  // Width resize (left/right square handles)
  function startWidthResize(e, box, direction) {
    e.stopPropagation();
    e.preventDefault();
    setWidthResizeState({
      id: box.id,
      startX: e.clientX,
      startWidth: box.width || 150,
      direction, // 'left' or 'right'
    });
  }

  function handleWidthResize(e) {
    if (!widthResizeState) return;

    const deltaX = e.clientX - widthResizeState.startX;
    let newWidth;

    if (widthResizeState.direction === "right") {
      newWidth = widthResizeState.startWidth + deltaX;
    } else {
      newWidth = widthResizeState.startWidth - deltaX;
    }

    newWidth = Math.max(80, Math.min(600, newWidth));

    setTextBoxes((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== widthResizeState.id) return t;
        return { ...t, width: Math.round(newWidth) };
      });
      return updated;
    });
  }

  function stopWidthResize() {
    if (!widthResizeState) return;
    setWidthResizeState(null);
    saveAnnotations();
    broadcastAnnotations();
  }

  // ─────────────────────────────────────────────────────────────
  // Mask blocks (white rectangles to hide content)
  // ─────────────────────────────────────────────────────────────

  function startMaskMove(e, mask) {
    e.stopPropagation();
    e.preventDefault();
    const p = getNormalizedPoint(e);
    if (!p) return;

    setMaskDrag({
      mode: "moving",
      id: mask.id,
      offsetX: p.x - mask.x,
      offsetY: p.y - mask.y,
    });
  }

  function deleteMask(id) {
    setMasks((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveAnnotations({ masks: next });
      broadcastAnnotations({ masks: next });
      return next;
    });
  }

  function finalizeCreatingMask(endPoint) {
    if (!maskDrag || maskDrag.mode !== "creating") return;
    const startX = maskDrag.startX;
    const startY = maskDrag.startY;
    const endX = endPoint?.x ?? maskDrag.currentX;
    const endY = endPoint?.y ?? maskDrag.currentY;

    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    const MIN = 0.01; // ignore very tiny rectangles
    if (width < MIN || height < MIN) return;

    const newMask = {
      id: `mask_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      x: left,
      y: top,
      width,
      height,
      page: isPdf ? pdfCurrentPage : 1,
    };

    setMasks((prev) => {
      const next = [...prev, newMask];
      saveAnnotations({ masks: next });
      broadcastAnnotations({ masks: next });
      return next;
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
    setMasks([]);
    setDragState(null);
    setMaskDrag(null);
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
          masks: [],
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
      masks: [],
    });
    broadcastPointer(null);
  }

  // ─────────────────────────────────────────────────────────────
  // Mouse handlers (attached to canvas/overlay)
  // ─────────────────────────────────────────────────────────────

  function handleMouseDown(e) {
    const target = e.target;
    if (
      target.closest &&
      (target.closest(".prep-sticky-note") ||
        target.closest(".prep-text-box") ||
        target.closest(".prep-mask-block"))
    ) {
      // Note/text/mask header handles its own drag start
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

    // White mask block: click-and-drag to create
    if (tool === TOOL_MASK) {
      e.preventDefault();
      const p = getNormalizedPoint(e);
      if (!p) return;
      setMaskDrag({
        mode: "creating",
        startX: p.x,
        startY: p.y,
        currentX: p.x,
        currentY: p.y,
      });
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
    // Handle font size resize
    if (resizeState) {
      e.preventDefault();
      handleFontSizeResize(e);
      return;
    }

    // Handle width resize
    if (widthResizeState) {
      e.preventDefault();
      handleWidthResize(e);
      return;
    }

    // Creating or moving a mask
    if (maskDrag) {
      e.preventDefault();
      const p = getNormalizedPoint(e);
      if (!p) return;

      if (maskDrag.mode === "creating") {
        setMaskDrag((prev) =>
          prev
            ? {
                ...prev,
                currentX: p.x,
                currentY: p.y,
              }
            : prev
        );
      } else if (maskDrag.mode === "moving") {
        const { id, offsetX, offsetY } = maskDrag;
        const newX = p.x - offsetX;
        const newY = p.y - offsetY;

        setMasks((prev) => {
          const next = prev.map((m) => {
            if (m.id !== id) return m;
            const clampedX = Math.min(1 - m.width, Math.max(0, newX));
            const clampedY = Math.min(1 - m.height, Math.max(0, newY));
            return { ...m, x: clampedX, y: clampedY };
          });
          saveAnnotations({ masks: next });
          broadcastAnnotations({ masks: next });
          return next;
        });
      }

      return;
    }

    // Existing drag logic (notes / text + drawing)
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

  function handleMouseUp(e) {
    if (resizeState) {
      stopFontSizeResize();
      return;
    }

    if (widthResizeState) {
      stopWidthResize();
      return;
    }

    if (maskDrag && maskDrag.mode === "creating") {
      const p = e ? getNormalizedPoint(e) : null;
      finalizeCreatingMask(p || null);
    }

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
  // Render overlay (canvas + SVG + notes + text + masks + pointer)
  // ─────────────────────────────────────────────────────────────

  function renderAnnotationsOverlay() {
    // If a menu is open, DISABLE overlay interaction completely
    const menusOpen = toolMenuOpen || colorMenuOpen;

    // Enable overlay only when interaction is needed
    const needsInteraction =
      !menusOpen &&
      (tool !== TOOL_NONE ||
        stickyNotes.length > 0 ||
        textBoxes.length > 0 ||
        masks.length > 0);

    const overlayPointerEvents = needsInteraction ? "auto" : "none";
    const overlayTouchAction = needsInteraction ? "none" : "auto";

    // Live preview for mask creation
    let maskPreview = null;
    if (maskDrag && maskDrag.mode === "creating") {
      const startX = maskDrag.startX;
      const startY = maskDrag.startY;
      const endX =
        typeof maskDrag.currentX === "number"
          ? maskDrag.currentX
          : maskDrag.startX;
      const endY =
        typeof maskDrag.currentY === "number"
          ? maskDrag.currentY
          : maskDrag.startY;

      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      maskPreview = { left, top, width, height };
    }

    return (
      <div
        className="prep-annotate-layer"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: overlayPointerEvents,
          touchAction: overlayTouchAction,
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Canvas for drawing */}
        <canvas
          ref={canvasRef}
          className={
            "prep-annotate-canvas" +
            (tool !== TOOL_NONE ? " prep-annotate-canvas--drawing" : "")
          }
          style={{
            width: "100%",
            height: "100%",
            pointerEvents: needsInteraction ? "auto" : "none",
            touchAction: needsInteraction ? "none" : "auto",
          }}
          onMouseDown={handleMouseDown}
        />

        {/* SVG strokes layer */}
        {/* SVG strokes layer */}
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
          {strokes
            .filter(
              (stroke) =>
                !isPdf || stroke.page === pdfCurrentPage || !stroke.page
            )
            .map((stroke) => (
              <polyline
                key={stroke.id}
                points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={
                  stroke.tool === TOOL_HIGHLIGHTER
                    ? "rgba(255,255,0,0.5)"
                    : stroke.color || "#111"
                }
                strokeWidth={stroke.tool === TOOL_HIGHLIGHTER ? 0.014 : 0.005}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
        </svg>
        {/* Text boxes layer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          {textBoxes
            .filter((box) => !isPdf || box.page === pdfCurrentPage || !box.page)
            .map((box) => {
              const isEditing = activeTextId === box.id;
              const isResizing = resizeState?.id === box.id;
              const isWidthResizing = widthResizeState?.id === box.id;
              const fontSize = box.fontSize || 16;
              const boxWidth = box.width || 150;

              return (
                <div
                  key={box.id}
                  className={
                    "prep-text-box" +
                    (isEditing ? " prep-text-box--editing" : "") +
                    (isResizing ? " prep-text-box--resizing" : "") +
                    (isWidthResizing ? " prep-text-box--width-resizing" : "")
                  }
                  style={{
                    position: "absolute",
                    left: `${box.x * 100}%`,
                    top: `${box.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "auto",
                  }}
                >
                  {isEditing ? (
                    <>
                      {/* Toolbar with Delete and Move buttons */}
                      <div className="prep-text-box__toolbar">
                        <button
                          type="button"
                          className="prep-text-box__toolbar-btn prep-text-box__toolbar-btn--delete"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            deleteTextBox(box.id);
                          }}
                          title="Delete"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="prep-text-box__toolbar-btn prep-text-box__toolbar-btn--move"
                          onMouseDown={(e) => startTextDrag(e, box)}
                          title="Move"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="5 9 2 12 5 15" />
                            <polyline points="9 5 12 2 15 5" />
                            <polyline points="15 19 12 22 9 19" />
                            <polyline points="19 9 22 12 19 15" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <line x1="12" y1="2" x2="12" y2="22" />
                          </svg>
                        </button>
                      </div>

                      {/* Main container with resize handles */}
                      <div className="prep-text-box__container">
                        {/* Left resize handle */}
                        <span
                          className="prep-text-box__side-handle prep-text-box__side-handle--left"
                          onMouseDown={(e) => startWidthResize(e, box, "left")}
                        />

                        {/* Input area */}
                        <div
                          className="prep-text-box__input-area"
                          style={{ width: `${boxWidth}px` }}
                        >
                          <textarea
                            data-textbox-id={box.id}
                            className="prep-text-box__textarea"
                            style={{
                              color: box.color,
                              fontSize: `${fontSize}px`,
                            }}
                            placeholder={t(
                              dict,
                              "resources_prep_text_placeholder"
                            )}
                            value={box.text}
                            onChange={(e) =>
                              updateTextBoxText(box.id, e.target.value)
                            }
                            onBlur={() => setActiveTextId(null)}
                            onMouseDown={(e) => e.stopPropagation()}
                          />

                          {/* Font size resize handle (circle) */}
                          <span
                            className="prep-text-box__fontsize-handle"
                            onMouseDown={(e) => startFontSizeResize(e, box)}
                            title="Resize font"
                          />
                        </div>

                        {/* Right resize handle */}
                        <span
                          className="prep-text-box__side-handle prep-text-box__side-handle--right"
                          onMouseDown={(e) => startWidthResize(e, box, "right")}
                        />
                      </div>
                    </>
                  ) : (
                    <div
                      className="prep-text-box__label"
                      style={{ color: box.color, fontSize: `${fontSize}px` }}
                      onMouseDown={(e) => startTextDrag(e, box)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setActiveTextId(box.id);
                      }}
                    >
                      {box.text}
                      <span
                        className="prep-text-box__resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          startFontSizeResize(e, box);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Sticky notes */}
        {/* Sticky notes */}
        {stickyNotes
          .filter(
            (note) => !isPdf || note.page === pdfCurrentPage || !note.page
          )
          .map((note) => (
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
                placeholder={t(dict, "resources_prep_note_placeholder")}
                value={note.text}
                onChange={(e) => updateNoteText(note.id, e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
          ))}

        {/* Saved mask blocks (white rectangles that hide content) */}
        {/* Saved mask blocks (white rectangles that hide content) */}
        {masks
          .filter(
            (mask) => !isPdf || mask.page === pdfCurrentPage || !mask.page
          )
          .map((mask) => (
            <div
              key={mask.id}
              className="prep-mask-block"
              style={{
                position: "absolute",
                left: `${mask.x * 100}%`,
                top: `${mask.y * 100}%`,
                width: `${mask.width * 100}%`,
                height: `${mask.height * 100}%`,
                backgroundColor: "#ffffff",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.12)",
                pointerEvents: "auto",
              }}
              onMouseDown={(e) => startMaskMove(e, mask)}
            />
          ))}

        {/* Live mask preview while dragging */}
        {maskPreview && (
          <div
            className="prep-mask-block prep-mask-block--preview"
            style={{
              position: "absolute",
              left: `${maskPreview.left * 100}%`,
              top: `${maskPreview.top * 100}%`,
              width: `${maskPreview.width * 100}%`,
              height: `${maskPreview.height * 100}%`,
              backgroundColor: "rgba(255,255,255,0.85)",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.2)",
              pointerEvents: "none", // don't block drag
            }}
          />
        )}

        {/* Pointer */}
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

  // ─────────────────────────────────────────────────────────────
  // Viewer activity flag
  // ─────────────────────────────────────────────────────────────

  const viewerIsActive = hasScreenShare || !!viewerUrl;

  // ─────────────────────────────────────────────────────────────
  // Audio tracks (single + multiple)
  // ─────────────────────────────────────────────────────────────

  const audioTracks = [];

  // New multi-track field from Sanity (optional)
  if (Array.isArray(resource.audioTracks)) {
    resource.audioTracks.forEach((track, index) => {
      if (!track) return;

      const url =
        track.fileUrl ||
        track.url ||
        (track.file && track.file.asset && track.file.asset.url);

      if (!url) return;

      audioTracks.push({
        id: track._key || `track_${index}`,
        label: track.label || `Track ${index + 1}`,
        url,
      });
    });
  }

  // Old single audio field (kept for compatibility / default)
  if (resource.audioUrl) {
    audioTracks.unshift({
      id: "main-audio",
      label: "Main audio",
      url: resource.audioUrl,
    });
  }

  const hasAudio = audioTracks.length > 0;
  const safeTrackIndex = hasAudio
    ? Math.min(currentTrackIndex, Math.max(audioTracks.length - 1, 0))
    : 0;
  const currentTrack = hasAudio ? audioTracks[safeTrackIndex] : null;

  // ─────────────────────────────────────────────────────────────
  // Current tool meta (for compact dropdown button)
  // ─────────────────────────────────────────────────────────────

  const currentToolIcon =
    tool === TOOL_PEN
      ? "🖊️"
      : tool === TOOL_HIGHLIGHTER
      ? "✨"
      : tool === TOOL_MASK
      ? "⬜"
      : tool === TOOL_TEXT
      ? "✍️"
      : tool === TOOL_ERASER
      ? "🧽"
      : tool === TOOL_NOTE
      ? "🗒️"
      : tool === TOOL_POINTER
      ? "➤"
      : "🛠️";

  const currentToolLabel =
    tool === TOOL_PEN
      ? t(dict, "resources_toolbar_pen")
      : tool === TOOL_HIGHLIGHTER
      ? t(dict, "resources_toolbar_highlighter")
      : tool === TOOL_MASK
      ? "Hide area"
      : tool === TOOL_TEXT
      ? t(dict, "resources_toolbar_text")
      : tool === TOOL_ERASER
      ? t(dict, "resources_toolbar_eraser")
      : tool === TOOL_NOTE
      ? t(dict, "resources_toolbar_note")
      : tool === TOOL_POINTER
      ? t(dict, "resources_toolbar_pointer")
      : t(dict, "resources_toolbar_pen");

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
              <div
                className="prep-annotate-toolbar"
                style={{ position: "relative", zIndex: 50 }}
              >
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
                    {"📋"}
                    <span>
                      {sidebarCollapsed
                        ? t(dict, "resources_toolbar_sidebar_show")
                        : t(dict, "resources_toolbar_sidebar_hide")}
                    </span>
                  </button>
                )}

                <div className="prep-annotate-toolbar__separator" />

                {hasAudio && (
                  <>
                    {audioTracks.length > 1 && (
                      <select
                        className="prep-annotate-toolbar__audio-select"
                        value={safeTrackIndex}
                        onChange={(e) => {
                          const nextIndex = Number(e.target.value) || 0;

                          setCurrentTrackIndex(nextIndex);
                          setIsAudioPlaying(false);

                          const el = audioRef.current;
                          if (el) {
                            el.pause();
                            el.currentTime = 0;
                          }

                          if (isTeacher && channelReady && sendOnChannel) {
                            sendOnChannel({
                              type: "AUDIO_TRACK",
                              resourceId: resource._id,
                              trackIndex: nextIndex,
                              time: 0,
                              playing: false,
                            });
                          }
                        }}
                      >
                        {audioTracks.map((track, idx) => (
                          <option key={track.id || idx} value={idx}>
                            {track.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Play / Pause toggle */}
                    <button
                      type="button"
                      className="prep-annotate-toolbar__btn prep-annotate-toolbar__btn--audio"
                      onClick={() => {
                        const el = audioRef.current;
                        if (!el) return;

                        if (isAudioPlaying) {
                          el.pause();
                          setIsAudioPlaying(false);

                          if (isTeacher && channelReady && sendOnChannel) {
                            sendOnChannel({
                              type: "AUDIO_PAUSE",
                              resourceId: resource._id,
                              trackIndex: safeTrackIndex,
                              time: el.currentTime || 0,
                            });
                          }
                        } else {
                          el.play().then(
                            () => {
                              setIsAudioPlaying(true);

                              if (isTeacher && channelReady && sendOnChannel) {
                                sendOnChannel({
                                  type: "AUDIO_PLAY",
                                  resourceId: resource._id,
                                  trackIndex: safeTrackIndex,
                                  time: el.currentTime || 0,
                                });
                              }
                            },
                            () => setIsAudioPlaying(false)
                          );
                        }
                      }}
                      aria-label={isAudioPlaying ? "Pause audio" : "Play audio"}
                    >
                      {isAudioPlaying ? "⏸" : "▶️"}
                    </button>

                    {/* Restart from beginning */}
                    <button
                      type="button"
                      className="prep-annotate-toolbar__btn prep-annotate-toolbar__btn--audio-restart"
                      onClick={() => {
                        const el = audioRef.current;
                        if (!el) return;

                        el.currentTime = 0;

                        if (isTeacher && channelReady && sendOnChannel) {
                          sendOnChannel({
                            type: "AUDIO_SEEK",
                            resourceId: resource._id,
                            trackIndex: safeTrackIndex,
                            time: 0,
                          });
                        }

                        el.play().then(
                          () => {
                            setIsAudioPlaying(true);

                            if (isTeacher && channelReady && sendOnChannel) {
                              sendOnChannel({
                                type: "AUDIO_PLAY",
                                resourceId: resource._id,
                                trackIndex: safeTrackIndex,
                                time: 0,
                              });
                            }
                          },
                          () => setIsAudioPlaying(false)
                        );
                      }}
                      aria-label="Play from beginning"
                    >
                      ⏮
                    </button>

                    {/* hidden actual audio element */}
                    <audio
                      ref={audioRef}
                      src={currentTrack ? currentTrack.url : undefined}
                      style={{ display: "none" }}
                    />
                  </>
                )}
                {/* TOOL DROPDOWN (compact) */}
                <div
                  className="prep-annotate-toolbar__dropdown"
                  ref={toolMenuRef}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <button
                    type="button"
                    className={
                      "prep-annotate-toolbar__btn prep-annotate-toolbar__btn--primary" +
                      (tool !== TOOL_NONE ? " is-active" : "")
                    }
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setToolMenuOpen((v) => !v);
                      setColorMenuOpen(false);
                    }}
                  >
                    <span className="prep-annotate-toolbar__dropdown-icon">
                      {currentToolIcon}
                    </span>
                    <span>{currentToolLabel}</span>
                    <span className="prep-annotate-toolbar__dropdown-caret">
                      ▾
                    </span>
                  </button>

                  {toolMenuOpen && (
                    <div
                      className="prep-annotate-toolbar__dropdown-menu"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <button
                        type="button"
                        className={
                          "prep-annotate-toolbar__btn prep-annotate-toolbar__btn--dropdown" +
                          (tool === TOOL_NONE ? " is-active" : "")
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setToolSafe(TOOL_NONE);
                          setToolMenuOpen(false);
                        }}
                      >
                        🚫 <span>Turn off tools</span>
                      </button>

                      <button
                        type="button"
                        className={
                          "prep-annotate-toolbar__btn prep-annotate-toolbar__btn--dropdown" +
                          (tool === TOOL_PEN ? " is-active" : "")
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setToolSafe(TOOL_PEN);
                          setToolMenuOpen(false);
                        }}
                      >
                        🖊️ <span>{t(dict, "resources_toolbar_pen")}</span>
                      </button>

                      <button
                        type="button"
                        className={
                          "prep-annotate-toolbar__btn prep-annotate-toolbar__btn--dropdown" +
                          (tool === TOOL_HIGHLIGHTER ? " is-active" : "")
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setToolSafe(TOOL_HIGHLIGHTER);
                          setToolMenuOpen(false);
                        }}
                      >
                        ✨{" "}
                        <span>{t(dict, "resources_toolbar_highlighter")}</span>
                      </button>

                      <button
                        type="button"
                        className={
                          "prep-annotate-toolbar__btn prep-annotate-toolbar__btn--dropdown" +
                          (tool === TOOL_MASK ? " is-active" : "")
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setToolSafe(TOOL_MASK);
                          setToolMenuOpen(false);
                        }}
                      >
                        ⬜ <span>Hide area</span>
                      </button>

                      <button
                        type="button"
                        className={
                          "prep-annotate-toolbar__btn prep-annotate-toolbar__btn--dropdown" +
                          (tool === TOOL_TEXT ? " is-active" : "")
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setToolSafe(TOOL_TEXT);
                          setToolMenuOpen(false);
                        }}
                      >
                        ✍️ <span>{t(dict, "resources_toolbar_text")}</span>
                      </button>

                      <button
                        type="button"
                        className={
                          "prep-annotate-toolbar__btn prep-annotate-toolbar__btn--dropdown" +
                          (tool === TOOL_ERASER ? " is-active" : "")
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setToolSafe(TOOL_ERASER);
                          setToolMenuOpen(false);
                        }}
                      >
                        🧽 <span>{t(dict, "resources_toolbar_eraser")}</span>
                      </button>

                      <button
                        type="button"
                        className={
                          "prep-annotate-toolbar__btn prep-annotate-toolbar__btn--dropdown" +
                          (tool === TOOL_NOTE ? " is-active" : "")
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setToolSafe(TOOL_NOTE);
                          setToolMenuOpen(false);
                        }}
                      >
                        🗒️ <span>{t(dict, "resources_toolbar_note")}</span>
                      </button>

                      <button
                        type="button"
                        className={
                          "prep-annotate-toolbar__btn prep-annotate-toolbar__btn--dropdown" +
                          (tool === TOOL_POINTER ? " is-active" : "")
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setToolSafe(TOOL_POINTER);
                          setToolMenuOpen(false);
                        }}
                      >
                        ➤ <span>{t(dict, "resources_toolbar_pointer")}</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="prep-annotate-toolbar__btn prep-annotate-toolbar__btn--danger"
                  onClick={clearCanvasAndNotes}
                >
                  🗑️ <span>{t(dict, "resources_toolbar_clear_all")}</span>
                </button>

                {/* COLOR PICKER DROPDOWN */}
                <div className="prep-annotate-colors">
                  <div
                    className="prep-annotate-colors__dropdown"
                    ref={colorMenuRef}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <button
                      type="button"
                      className={
                        "prep-annotate-color prep-annotate-color--picker"
                      }
                      style={{ backgroundColor: penColor }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setColorMenuOpen((v) => !v);
                        setToolMenuOpen(false);
                      }}
                    />

                    {colorMenuOpen && (
                      <div
                        className="prep-annotate-colors__menu"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        {PEN_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={
                              "prep-annotate-color" +
                              (penColor === c ? " is-active" : "")
                            }
                            style={{ backgroundColor: c }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPenColor(c);
                              setColorMenuOpen(false);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
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
                      onNavStateChange={handlePdfNavStateChange}
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
