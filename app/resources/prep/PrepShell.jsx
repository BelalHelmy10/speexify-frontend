// app/resources/prep/PrepShell.jsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

const PEN_COLORS = [
  "#000000",
  "#f9fafb",
  "#fbbf24",
  "#60a5fa",
  "#f97316",
  "#22c55e",
];

/**
 * Props:
 *  - resource, viewer: as before (prep room)
 *  - hideSidebar (optional): when true, do NOT render the left info/notes column
 *  - hideBreadcrumbs (optional): when true, no breadcrumbs row
 *  - classroomChannel (optional): in classroom mode, used to sync annotations
 */
export default function PrepShell({
  resource,
  viewer,
  hideSidebar = false,
  hideBreadcrumbs = false,
  classroomChannel,
}) {
  const [focusMode, setFocusMode] = useState(false);
  const [tool, setTool] = useState(TOOL_NONE);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pointerPos, setPointerPos] = useState(null);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [dragState, setDragState] = useState(null);
  const [activeTextId, setActiveTextId] = useState(null);
  const [pdfFallback, setPdfFallback] = useState(false);

  // PDF page tracking
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pdfCanvasSize, setPdfCanvasSize] = useState({ width: 0, height: 0 });
  const pdfViewerRef = useRef(null);

  // Per-page annotation storage
  // Structure: { [pageNum]: { stickyNotes: [], textBoxes: [], canvasData: null } }
  const [annotationsByPage, setAnnotationsByPage] = useState({});

  // Get current page's annotations
  const currentAnnotations = annotationsByPage[currentPage] || {
    stickyNotes: [],
    textBoxes: [],
    canvasData: null,
  };
  const stickyNotes = currentAnnotations.stickyNotes;
  const textBoxes = currentAnnotations.textBoxes;

  const canvasRef = useRef(null);
  const containerRef = useRef(null); // For non-PDF viewers
  const applyingRemoteRef = useRef(false);

  const storageKey = `prep_annotations_v2_${resource._id}`;

  const viewerUrl = viewer?.viewerUrl || null;
  const unit = resource.unit;
  const subLevel = unit?.subLevel;
  const level = subLevel?.level;
  const track = level?.track;

  const viewerActive = !!viewerUrl;
  const isPdf = viewer?.type === "pdf" && !pdfFallback;

  const channelReady = !!classroomChannel?.ready;
  const sendOnChannel = classroomChannel?.send;

  // ─────────────────────────────────────────────────────────────
  // Helper: Update annotations for a specific page
  // ─────────────────────────────────────────────────────────────
  const updatePageAnnotations = useCallback((pageNum, updates) => {
    setAnnotationsByPage((prev) => {
      const current = prev[pageNum] || {
        stickyNotes: [],
        textBoxes: [],
        canvasData: null,
      };
      return {
        ...prev,
        [pageNum]: { ...current, ...updates },
      };
    });
  }, []);

  // ─────────────────────────────────────────────────────────────
  // PDF page change handler
  // ─────────────────────────────────────────────────────────────
  const handlePageChange = useCallback(
    (pageNum, totalPages) => {
      // Save current page's canvas before switching
      if (canvasRef.current && currentPage !== pageNum && currentPage > 0) {
        const canvasData = canvasRef.current.toDataURL("image/png");
        updatePageAnnotations(currentPage, { canvasData });
      }

      setCurrentPage(pageNum);
      setNumPages(totalPages);

      // Broadcast page change to classroom
      if (channelReady && sendOnChannel) {
        sendOnChannel({
          type: "SET_PAGE",
          resourceId: resource._id,
          pageNum,
          totalPages,
        });
      }
    },
    [
      currentPage,
      channelReady,
      sendOnChannel,
      resource._id,
      updatePageAnnotations,
    ]
  );

  // ─────────────────────────────────────────────────────────────
  // Restore canvas when page changes or canvas size updates
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || !pdfCanvasSize.width || !pdfCanvasSize.height)
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Resize canvas to match PDF
    if (
      canvas.width !== pdfCanvasSize.width ||
      canvas.height !== pdfCanvasSize.height
    ) {
      canvas.width = pdfCanvasSize.width;
      canvas.height = pdfCanvasSize.height;
    }

    // Clear and restore page's drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageData = annotationsByPage[currentPage];
    if (pageData?.canvasData) {
      const img = new Image();
      img.onload = () => {
        const c = canvasRef.current;
        if (!c) return;
        const context = c.getContext("2d");
        context.drawImage(img, 0, 0, c.width, c.height);
      };
      img.src = pageData.canvasData;
    }
  }, [currentPage, pdfCanvasSize, annotationsByPage]);

  // Focus newly-activated text box
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

      // New format: annotationsByPage
      if (parsed.annotationsByPage) {
        setAnnotationsByPage(parsed.annotationsByPage);
      }
      // Legacy format: migrate to per-page (put on page 1)
      else if (parsed.stickyNotes || parsed.textBoxes || parsed.canvasData) {
        setAnnotationsByPage({
          1: {
            stickyNotes: parsed.stickyNotes || [],
            textBoxes: parsed.textBoxes || [],
            canvasData: parsed.canvasData || null,
          },
        });
      }
    } catch (err) {
      console.warn("Failed to load annotations", err);
    }
  }, [storageKey]);

  // ─────────────────────────────────────────────────────────────
  // Save annotations
  // ─────────────────────────────────────────────────────────────
  function saveAnnotations(opts = {}) {
    if (!storageKey) return;
    try {
      const canvas = canvasRef.current;
      const canvasData =
        opts.canvasData ?? (canvas ? canvas.toDataURL("image/png") : null);

      const updatedPageAnnotations = {
        ...annotationsByPage,
        [currentPage]: {
          stickyNotes: opts.stickyNotes ?? stickyNotes,
          textBoxes: opts.textBoxes ?? textBoxes,
          canvasData: canvasData,
        },
      };

      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ annotationsByPage: updatedPageAnnotations })
      );
    } catch (err) {
      console.warn("Failed to save annotations", err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Broadcast annotations
  // ─────────────────────────────────────────────────────────────
  function broadcastAnnotations(custom = {}) {
    if (!channelReady || !sendOnChannel) return;
    if (applyingRemoteRef.current) return;

    const canvas = canvasRef.current;
    const canvasData =
      custom.canvasData ?? (canvas ? canvas.toDataURL("image/png") : null);

    sendOnChannel({
      type: "ANNOTATION_STATE",
      resourceId: resource._id,
      pageNum: currentPage,
      canvasData: canvasData || null,
      stickyNotes: custom.stickyNotes ?? stickyNotes,
      textBoxes: custom.textBoxes ?? textBoxes,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Broadcast pointer
  // ─────────────────────────────────────────────────────────────
  function broadcastPointer(normalizedPosOrNull) {
    if (!channelReady || !sendOnChannel) return;
    if (applyingRemoteRef.current) return;

    if (!normalizedPosOrNull) {
      sendOnChannel({ type: "POINTER_HIDE", resourceId: resource._id });
      return;
    }

    sendOnChannel({
      type: "POINTER_MOVE",
      resourceId: resource._id,
      pageNum: currentPage,
      xNorm: normalizedPosOrNull.x,
      yNorm: normalizedPosOrNull.y,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Apply remote annotation state
  // ─────────────────────────────────────────────────────────────
  function applyRemoteAnnotationState(message) {
    if (!message || message.resourceId !== resource._id) return;

    const {
      pageNum,
      canvasData,
      stickyNotes: remoteNotes,
      textBoxes: remoteText,
    } = message;
    const targetPage = pageNum || currentPage;

    applyingRemoteRef.current = true;
    try {
      setAnnotationsByPage((prev) => ({
        ...prev,
        [targetPage]: {
          stickyNotes: Array.isArray(remoteNotes) ? remoteNotes : [],
          textBoxes: Array.isArray(remoteText) ? remoteText : [],
          canvasData: canvasData || null,
        },
      }));

      // If for current page, update canvas
      if (targetPage === currentPage && canvasRef.current && canvasData) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.onload = () => {
          const c = canvasRef.current;
          if (!c) return;
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        };
        img.src = canvasData;
      }
    } finally {
      applyingRemoteRef.current = false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Subscribe to classroom channel
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!classroomChannel?.ready || !classroomChannel?.subscribe) return;

    const unsubscribe = classroomChannel.subscribe((msg) => {
      if (!msg || msg.resourceId !== resource._id) return;

      if (msg.type === "ANNOTATION_STATE") {
        applyRemoteAnnotationState(msg);
      } else if (
        msg.type === "SET_PAGE" &&
        msg.pageNum &&
        pdfViewerRef.current
      ) {
        pdfViewerRef.current.goToPage(msg.pageNum);
      } else if (msg.type === "POINTER_MOVE" && msg.pageNum === currentPage) {
        const w = pdfCanvasSize.width || 1;
        const h = pdfCanvasSize.height || 1;
        setPointerPos({ x: msg.xNorm * w, y: msg.yNorm * h });
      } else if (msg.type === "POINTER_HIDE") {
        setPointerPos(null);
      }
    });

    return unsubscribe;
  }, [classroomChannel, resource._id, currentPage, pdfCanvasSize]);

  // ─────────────────────────────────────────────────────────────
  // Coordinate helpers
  // ─────────────────────────────────────────────────────────────
  function getCanvasCoordinates(event, canvasWidth, canvasHeight) {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: canvasWidth || rect.width,
      height: canvasHeight || rect.height,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Drawing
  // ─────────────────────────────────────────────────────────────
  function startDrawing(e, canvasWidth, canvasHeight) {
    if (tool !== TOOL_PEN && tool !== TOOL_HIGHLIGHTER && tool !== TOOL_ERASER)
      return;
    const coords = getCanvasCoordinates(e, canvasWidth, canvasHeight);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  }

  function draw(e, canvasWidth, canvasHeight) {
    if (dragState) {
      const coords = getCanvasCoordinates(e, canvasWidth, canvasHeight);
      if (!coords) return;
      const { width, height, x, y } = coords;

      if (dragState.kind === "note") {
        const updated = stickyNotes.map((n) => {
          if (n.id !== dragState.id) return n;
          return {
            ...n,
            x: Math.min(0.95, Math.max(0.02, (x + dragState.offsetX) / width)),
            y: Math.min(0.95, Math.max(0.02, (y + dragState.offsetY) / height)),
          };
        });
        updatePageAnnotations(currentPage, { stickyNotes: updated });
        saveAnnotations({ stickyNotes: updated });
        broadcastAnnotations({ stickyNotes: updated });
      } else if (dragState.kind === "text") {
        const updated = textBoxes.map((t) => {
          if (t.id !== dragState.id) return t;
          return {
            ...t,
            x: Math.min(0.95, Math.max(0.02, (x + dragState.offsetX) / width)),
            y: Math.min(0.95, Math.max(0.02, (y + dragState.offsetY) / height)),
          };
        });
        updatePageAnnotations(currentPage, { textBoxes: updated });
        saveAnnotations({ textBoxes: updated });
        broadcastAnnotations({ textBoxes: updated });
      }
      return;
    }

    if (!isDrawing) {
      if (tool === TOOL_POINTER) {
        updatePointer(e, canvasWidth, canvasHeight);
      }
      return;
    }

    if (tool !== TOOL_PEN && tool !== TOOL_HIGHLIGHTER && tool !== TOOL_ERASER)
      return;

    const coords = getCanvasCoordinates(e, canvasWidth, canvasHeight);
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
      ctx.strokeStyle = "rgba(250, 224, 120, 0.5)";
      ctx.lineWidth = 18;
      ctx.globalAlpha = 0.5;
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

    const canvas = canvasRef.current;
    const canvasData = canvas ? canvas.toDataURL("image/png") : null;
    updatePageAnnotations(currentPage, { canvasData });
    saveAnnotations({ canvasData });
    broadcastAnnotations({ canvasData });
  }

  // ─────────────────────────────────────────────────────────────
  // Pointer
  // ─────────────────────────────────────────────────────────────
  function updatePointer(e, canvasWidth, canvasHeight) {
    if (tool !== TOOL_POINTER) {
      setPointerPos(null);
      broadcastPointer(null);
      return;
    }
    const coords = getCanvasCoordinates(e, canvasWidth, canvasHeight);
    if (!coords) return;

    setPointerPos({ x: coords.x, y: coords.y });
    broadcastPointer({
      x: coords.width ? coords.x / coords.width : 0,
      y: coords.height ? coords.y / coords.height : 0,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Sticky notes
  // ─────────────────────────────────────────────────────────────
  function handleClickForNote(e, canvasWidth, canvasHeight) {
    if (tool !== TOOL_NOTE) return;

    const coords = getCanvasCoordinates(e, canvasWidth, canvasHeight);
    if (!coords) return;

    const note = {
      id: `note_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      x: coords.x / coords.width,
      y: coords.y / coords.height,
      text: "",
    };

    const nextNotes = [...stickyNotes, note];
    updatePageAnnotations(currentPage, { stickyNotes: nextNotes });
    saveAnnotations({ stickyNotes: nextNotes });
    broadcastAnnotations({ stickyNotes: nextNotes });
    setTool(TOOL_NONE);
  }

  function updateNoteText(id, text) {
    const next = stickyNotes.map((n) => (n.id === id ? { ...n, text } : n));
    updatePageAnnotations(currentPage, { stickyNotes: next });
    saveAnnotations({ stickyNotes: next });
    broadcastAnnotations({ stickyNotes: next });
  }

  function deleteNote(id) {
    const next = stickyNotes.filter((n) => n.id !== id);
    updatePageAnnotations(currentPage, { stickyNotes: next });
    saveAnnotations({ stickyNotes: next });
    broadcastAnnotations({ stickyNotes: next });
  }

  function startNoteDrag(e, note, canvasWidth, canvasHeight) {
    e.stopPropagation();
    e.preventDefault();
    const coords = getCanvasCoordinates(e, canvasWidth, canvasHeight);
    if (!coords) return;

    setDragState({
      kind: "note",
      id: note.id,
      offsetX: note.x * coords.width - coords.x,
      offsetY: note.y * coords.height - coords.y,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Text boxes
  // ─────────────────────────────────────────────────────────────
  function createTextBox(e, canvasWidth, canvasHeight) {
    const coords = getCanvasCoordinates(e, canvasWidth, canvasHeight);
    if (!coords) return;

    const box = {
      id: `text_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      x: coords.x / coords.width,
      y: coords.y / coords.height,
      text: "",
      color: penColor,
    };

    const next = [...textBoxes, box];
    updatePageAnnotations(currentPage, { textBoxes: next });
    setActiveTextId(box.id);
    saveAnnotations({ textBoxes: next });
    broadcastAnnotations({ textBoxes: next });
  }

  function updateTextBoxText(id, text) {
    const next = textBoxes.map((t) => (t.id === id ? { ...t, text } : t));
    updatePageAnnotations(currentPage, { textBoxes: next });
    saveAnnotations({ textBoxes: next });
    broadcastAnnotations({ textBoxes: next });
  }

  function deleteTextBox(id) {
    const next = textBoxes.filter((t) => t.id !== id);
    updatePageAnnotations(currentPage, { textBoxes: next });
    saveAnnotations({ textBoxes: next });
    broadcastAnnotations({ textBoxes: next });
    if (activeTextId === id) setActiveTextId(null);
  }

  function startTextDrag(e, box, canvasWidth, canvasHeight) {
    e.stopPropagation();
    e.preventDefault();
    const coords = getCanvasCoordinates(e, canvasWidth, canvasHeight);
    if (!coords) return;

    setDragState({
      kind: "text",
      id: box.id,
      offsetX: box.x * coords.width - coords.x,
      offsetY: box.y * coords.height - coords.y,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Clear all (current page)
  // ─────────────────────────────────────────────────────────────
  function clearCanvasAndNotes() {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    updatePageAnnotations(currentPage, {
      stickyNotes: [],
      textBoxes: [],
      canvasData: null,
    });

    setDragState(null);
    setActiveTextId(null);

    saveAnnotations({ canvasData: null, stickyNotes: [], textBoxes: [] });
    broadcastAnnotations({ canvasData: null, stickyNotes: [], textBoxes: [] });
  }

  // ─────────────────────────────────────────────────────────────
  // Mouse handlers (receive canvas dimensions)
  // ─────────────────────────────────────────────────────────────
  function createMouseHandlers(canvasWidth, canvasHeight) {
    return {
      handleMouseDown: (e) => {
        const target = e.target;
        if (
          target.closest?.(".prep-sticky-note") ||
          target.closest?.(".prep-text-box")
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
          createTextBox(e, canvasWidth, canvasHeight);
          return;
        }

        if (
          tool === TOOL_PEN ||
          tool === TOOL_HIGHLIGHTER ||
          tool === TOOL_ERASER
        ) {
          e.preventDefault();
          startDrawing(e, canvasWidth, canvasHeight);
        } else if (tool === TOOL_NOTE) {
          e.preventDefault();
          handleClickForNote(e, canvasWidth, canvasHeight);
        }
      },

      handleMouseMove: (e) => {
        if (dragState) {
          e.preventDefault();
          draw(e, canvasWidth, canvasHeight);
          return;
        }

        if (tool === TOOL_POINTER) {
          updatePointer(e, canvasWidth, canvasHeight);
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
          draw(e, canvasWidth, canvasHeight);
        }
      },

      handleMouseUp: () => {
        stopDrawing();
        if (dragState) {
          setDragState(null);
          saveAnnotations();
          broadcastAnnotations();
        }
      },
    };
  }

  // Tool toggle
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
  // Render annotation overlay for PDF (via render prop)
  // ─────────────────────────────────────────────────────────────
  function renderPdfAnnotationOverlay({ canvasWidth, canvasHeight }) {
    // Store dimensions for coordinate calculations
    if (
      canvasWidth !== pdfCanvasSize.width ||
      canvasHeight !== pdfCanvasSize.height
    ) {
      setPdfCanvasSize({ width: canvasWidth, height: canvasHeight });
    }

    const handlers = createMouseHandlers(canvasWidth, canvasHeight);

    return (
      <>
        {/* Drawing canvas */}
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: canvasWidth,
            height: canvasHeight,
            pointerEvents: tool !== TOOL_NONE ? "auto" : "none",
            cursor:
              tool === TOOL_PEN || tool === TOOL_HIGHLIGHTER
                ? "crosshair"
                : tool === TOOL_ERASER
                ? "cell"
                : tool === TOOL_TEXT
                ? "text"
                : tool === TOOL_NOTE
                ? "copy"
                : tool === TOOL_POINTER
                ? "pointer"
                : "default",
          }}
          onMouseDown={handlers.handleMouseDown}
          onMouseMove={handlers.handleMouseMove}
          onMouseUp={handlers.handleMouseUp}
          onMouseLeave={handlers.handleMouseUp}
        />

        {/* Sticky notes */}
        {stickyNotes.map((note) => (
          <div
            key={note.id}
            className="prep-sticky-note"
            style={{
              position: "absolute",
              left: `${note.x * 100}%`,
              top: `${note.y * 100}%`,
              pointerEvents: "auto",
              zIndex: 20,
            }}
          >
            <div
              className="prep-sticky-note__header"
              onMouseDown={(e) =>
                startNoteDrag(e, note, canvasWidth, canvasHeight)
              }
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
                position: "absolute",
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                pointerEvents: "auto",
                zIndex: 20,
              }}
            >
              {isEditing ? (
                <>
                  <div
                    className="prep-text-box__header"
                    onMouseDown={(e) =>
                      startTextDrag(e, box, canvasWidth, canvasHeight)
                    }
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
                  onMouseDown={(e) =>
                    startTextDrag(e, box, canvasWidth, canvasHeight)
                  }
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setActiveTextId(box.id);
                  }}
                >
                  {box.text || "(empty)"}
                </div>
              )}
            </div>
          );
        })}

        {/* Pointer */}
        {pointerPos && (
          <div
            className="prep-pointer"
            style={{
              position: "absolute",
              left: pointerPos.x,
              top: pointerPos.y,
              pointerEvents: "none",
              zIndex: 30,
            }}
          />
        )}
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Non-PDF annotation overlay (for iframes)
  // ─────────────────────────────────────────────────────────────
  function renderIframeAnnotationsOverlay() {
    const handlers = createMouseHandlers(
      containerRef.current?.clientWidth || 800,
      containerRef.current?.clientHeight || 600
    );

    return (
      <>
        <canvas
          ref={canvasRef}
          className={
            "prep-annotate-canvas" +
            (tool !== TOOL_NONE ? " prep-annotate-canvas--drawing" : "")
          }
          onMouseDown={handlers.handleMouseDown}
          onMouseMove={handlers.handleMouseMove}
          onMouseUp={handlers.handleMouseUp}
          onMouseLeave={handlers.handleMouseUp}
        />

        {stickyNotes.map((note) => (
          <div
            key={note.id}
            className="prep-sticky-note"
            style={{ left: `${note.x * 100}%`, top: `${note.y * 100}%` }}
          >
            <div
              className="prep-sticky-note__header"
              onMouseDown={(e) =>
                startNoteDrag(
                  e,
                  note,
                  containerRef.current?.clientWidth,
                  containerRef.current?.clientHeight
                )
              }
            >
              <button
                type="button"
                className="prep-sticky-note__close"
                onClick={() => deleteNote(note.id)}
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
                    onMouseDown={(e) =>
                      startTextDrag(
                        e,
                        box,
                        containerRef.current?.clientWidth,
                        containerRef.current?.clientHeight
                      )
                    }
                  >
                    <span className="prep-text-box__drag-handle" />
                    <button
                      type="button"
                      className="prep-text-box__close"
                      onClick={() => deleteTextBox(box.id)}
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
                  onMouseDown={(e) =>
                    startTextDrag(
                      e,
                      box,
                      containerRef.current?.clientWidth,
                      containerRef.current?.clientHeight
                    )
                  }
                  onDoubleClick={() => setActiveTextId(box.id)}
                >
                  {box.text || "(empty)"}
                </div>
              )}
            </div>
          );
        })}

        {pointerPos && (
          <div
            className="prep-pointer"
            style={{ left: pointerPos.x, top: pointerPos.y }}
          />
        )}
      </>
    );
  }

  // Resize canvas for non-PDF viewers
  useEffect(() => {
    if (isPdf) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    function resizeCanvas() {
      const rect = container.getBoundingClientRect();
      const prev =
        canvas.width && canvas.height ? canvas.toDataURL("image/png") : null;

      canvas.width = rect.width;
      canvas.height = rect.height;

      if (prev) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = prev;
      }
    }

    resizeCanvas();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(resizeCanvas);
      observer.observe(container);
      return () => observer.disconnect();
    }
  }, [isPdf]);

  const showSidebar = !hideSidebar;
  const showBreadcrumbs = !hideBreadcrumbs;

  const layoutClasses =
    "prep-layout" +
    (focusMode ? " prep-layout--focus" : "") +
    (hideSidebar ? " prep-layout--no-sidebar" : "");

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
                  {isPdf &&
                    numPages > 0 &&
                    ` · Page ${currentPage} / ${numPages}`}
                </span>
              </div>

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
                  <div className="prep-viewer__canvas-container">
                    <PdfViewerWithSidebar
                      ref={pdfViewerRef}
                      fileUrl={viewerUrl}
                      onFatalError={() => setPdfFallback(true)}
                      onPageChange={handlePageChange}
                      renderOverlay={renderPdfAnnotationOverlay}
                    />
                  </div>
                ) : (
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
                    {renderIframeAnnotationsOverlay()}
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
