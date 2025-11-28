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

  // PDF state
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pdfCanvasSize, setPdfCanvasSize] = useState({ width: 0, height: 0 });
  const pdfViewerRef = useRef(null);

  // Per-page annotations: { [page]: { stickyNotes, textBoxes, canvasData } }
  const [annotationsByPage, setAnnotationsByPage] = useState({});

  // Current page's annotations
  const pageAnnotations = annotationsByPage[currentPage] || {
    stickyNotes: [],
    textBoxes: [],
    canvasData: null,
  };
  const stickyNotes = pageAnnotations.stickyNotes;
  const textBoxes = pageAnnotations.textBoxes;

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const applyingRemoteRef = useRef(false);

  const storageKey = `prep_annotations_v3_${resource._id}`;
  const viewerUrl = viewer?.viewerUrl || null;
  const unit = resource.unit;
  const subLevel = unit?.subLevel;
  const level = subLevel?.level;
  const track = level?.track;
  const viewerActive = !!viewerUrl;
  const isPdf = viewer?.type === "pdf" && !pdfFallback;
  const channelReady = !!classroomChannel?.ready;
  const sendOnChannel = classroomChannel?.send;

  // ───────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────
  const updatePageAnnotations = useCallback((page, updates) => {
    setAnnotationsByPage((prev) => ({
      ...prev,
      [page]: {
        ...(prev[page] || { stickyNotes: [], textBoxes: [], canvasData: null }),
        ...updates,
      },
    }));
  }, []);

  // ───────────────────────────────────────────────────────────
  // PDF callbacks
  // ───────────────────────────────────────────────────────────
  const handlePageChange = useCallback(
    (pageNum, totalPages) => {
      // Save current canvas before switching
      if (canvasRef.current && currentPage !== pageNum && currentPage > 0) {
        const data = canvasRef.current.toDataURL("image/png");
        updatePageAnnotations(currentPage, { canvasData: data });
      }
      setCurrentPage(pageNum);
      setNumPages(totalPages);

      // Broadcast to classroom
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

  const handleCanvasSizeChange = useCallback((size) => {
    setPdfCanvasSize(size);
  }, []);

  // ───────────────────────────────────────────────────────────
  // Restore canvas when page/size changes
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pdfCanvasSize.width || !pdfCanvasSize.height) return;

    // Resize canvas
    if (
      canvas.width !== pdfCanvasSize.width ||
      canvas.height !== pdfCanvasSize.height
    ) {
      canvas.width = pdfCanvasSize.width;
      canvas.height = pdfCanvasSize.height;
    }

    // Clear and restore
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const data = annotationsByPage[currentPage]?.canvasData;
    if (data) {
      const img = new Image();
      img.onload = () => {
        if (canvasRef.current) {
          canvasRef.current
            .getContext("2d")
            .drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      };
      img.src = data;
    }
  }, [currentPage, pdfCanvasSize, annotationsByPage]);

  // Focus text box
  useEffect(() => {
    if (activeTextId) {
      const el = document.querySelector(`[data-textbox-id="${activeTextId}"]`);
      if (el) el.focus();
    }
  }, [activeTextId]);

  // ───────────────────────────────────────────────────────────
  // Load/save localStorage
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.annotationsByPage) {
        setAnnotationsByPage(parsed.annotationsByPage);
      } else if (parsed.stickyNotes || parsed.textBoxes || parsed.canvasData) {
        // Legacy migration
        setAnnotationsByPage({
          1: {
            stickyNotes: parsed.stickyNotes || [],
            textBoxes: parsed.textBoxes || [],
            canvasData: parsed.canvasData,
          },
        });
      }
    } catch (e) {
      console.warn("Failed to load annotations", e);
    }
  }, [storageKey]);

  function saveAnnotations(opts = {}) {
    if (!storageKey) return;
    try {
      const canvas = canvasRef.current;
      const canvasData =
        opts.canvasData ?? (canvas ? canvas.toDataURL("image/png") : null);
      const updated = {
        ...annotationsByPage,
        [currentPage]: {
          stickyNotes: opts.stickyNotes ?? stickyNotes,
          textBoxes: opts.textBoxes ?? textBoxes,
          canvasData,
        },
      };
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ annotationsByPage: updated })
      );
    } catch (e) {
      console.warn("Failed to save annotations", e);
    }
  }

  // ───────────────────────────────────────────────────────────
  // Broadcast
  // ───────────────────────────────────────────────────────────
  function broadcastAnnotations(custom = {}) {
    if (!channelReady || !sendOnChannel || applyingRemoteRef.current) return;
    const canvas = canvasRef.current;
    const canvasData =
      custom.canvasData ?? (canvas ? canvas.toDataURL("image/png") : null);
    sendOnChannel({
      type: "ANNOTATION_STATE",
      resourceId: resource._id,
      pageNum: currentPage,
      canvasData,
      stickyNotes: custom.stickyNotes ?? stickyNotes,
      textBoxes: custom.textBoxes ?? textBoxes,
    });
  }

  function broadcastPointer(pos) {
    if (!channelReady || !sendOnChannel || applyingRemoteRef.current) return;
    if (!pos) {
      sendOnChannel({ type: "POINTER_HIDE", resourceId: resource._id });
    } else {
      sendOnChannel({
        type: "POINTER_MOVE",
        resourceId: resource._id,
        pageNum: currentPage,
        xNorm: pos.x,
        yNorm: pos.y,
      });
    }
  }

  // ───────────────────────────────────────────────────────────
  // Apply remote state
  // ───────────────────────────────────────────────────────────
  function applyRemoteState(msg) {
    if (!msg || msg.resourceId !== resource._id) return;
    const { pageNum, canvasData, stickyNotes: rNotes, textBoxes: rText } = msg;
    const targetPage = pageNum || currentPage;

    applyingRemoteRef.current = true;
    try {
      setAnnotationsByPage((prev) => ({
        ...prev,
        [targetPage]: {
          stickyNotes: Array.isArray(rNotes) ? rNotes : [],
          textBoxes: Array.isArray(rText) ? rText : [],
          canvasData: canvasData || null,
        },
      }));

      if (targetPage === currentPage && canvasRef.current && canvasData) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        const img = new Image();
        img.onload = () => {
          if (canvasRef.current) {
            canvasRef.current.getContext("2d").drawImage(img, 0, 0);
          }
        };
        img.src = canvasData;
      }
    } finally {
      applyingRemoteRef.current = false;
    }
  }

  // Subscribe to classroom
  useEffect(() => {
    if (!classroomChannel?.ready || !classroomChannel?.subscribe) return;
    const unsub = classroomChannel.subscribe((msg) => {
      if (!msg || msg.resourceId !== resource._id) return;
      if (msg.type === "ANNOTATION_STATE") applyRemoteState(msg);
      else if (msg.type === "SET_PAGE" && msg.pageNum && pdfViewerRef.current)
        pdfViewerRef.current.goToPage(msg.pageNum);
      else if (msg.type === "POINTER_MOVE" && msg.pageNum === currentPage) {
        setPointerPos({
          x: msg.xNorm * pdfCanvasSize.width,
          y: msg.yNorm * pdfCanvasSize.height,
        });
      } else if (msg.type === "POINTER_HIDE") setPointerPos(null);
    });
    return unsub;
  }, [classroomChannel, resource._id, currentPage, pdfCanvasSize]);

  // ───────────────────────────────────────────────────────────
  // Drawing handlers
  // ───────────────────────────────────────────────────────────
  function getCoords(e, w, h) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      width: w || rect.width,
      height: h || rect.height,
    };
  }

  function startDrawing(e, w, h) {
    if (![TOOL_PEN, TOOL_HIGHLIGHTER, TOOL_ERASER].includes(tool)) return;
    const coords = getCoords(e, w, h);
    if (!coords) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  }

  function draw(e, w, h) {
    const coords = getCoords(e, w, h);
    if (!coords) return;

    if (dragState) {
      if (dragState.kind === "note") {
        const updated = stickyNotes.map((n) =>
          n.id !== dragState.id
            ? n
            : {
                ...n,
                x: Math.min(
                  0.95,
                  Math.max(0.02, (coords.x + dragState.offsetX) / coords.width)
                ),
                y: Math.min(
                  0.95,
                  Math.max(0.02, (coords.y + dragState.offsetY) / coords.height)
                ),
              }
        );
        updatePageAnnotations(currentPage, { stickyNotes: updated });
        saveAnnotations({ stickyNotes: updated });
        broadcastAnnotations({ stickyNotes: updated });
      } else if (dragState.kind === "text") {
        const updated = textBoxes.map((t) =>
          t.id !== dragState.id
            ? t
            : {
                ...t,
                x: Math.min(
                  0.95,
                  Math.max(0.02, (coords.x + dragState.offsetX) / coords.width)
                ),
                y: Math.min(
                  0.95,
                  Math.max(0.02, (coords.y + dragState.offsetY) / coords.height)
                ),
              }
        );
        updatePageAnnotations(currentPage, { textBoxes: updated });
        saveAnnotations({ textBoxes: updated });
        broadcastAnnotations({ textBoxes: updated });
      }
      return;
    }

    if (!isDrawing) {
      if (tool === TOOL_POINTER) updatePointer(e, w, h);
      return;
    }

    if (![TOOL_PEN, TOOL_HIGHLIGHTER, TOOL_ERASER].includes(tool)) return;

    const ctx = canvasRef.current.getContext("2d");
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
    const canvasData = canvasRef.current?.toDataURL("image/png") || null;
    updatePageAnnotations(currentPage, { canvasData });
    saveAnnotations({ canvasData });
    broadcastAnnotations({ canvasData });
  }

  function updatePointer(e, w, h) {
    if (tool !== TOOL_POINTER) {
      setPointerPos(null);
      broadcastPointer(null);
      return;
    }
    const coords = getCoords(e, w, h);
    if (!coords) return;
    setPointerPos({ x: coords.x, y: coords.y });
    broadcastPointer({
      x: coords.x / coords.width,
      y: coords.y / coords.height,
    });
  }

  // ───────────────────────────────────────────────────────────
  // Notes & Text
  // ───────────────────────────────────────────────────────────
  function addNote(e, w, h) {
    if (tool !== TOOL_NOTE) return;
    const coords = getCoords(e, w, h);
    if (!coords) return;
    const note = {
      id: `note_${Date.now()}`,
      x: coords.x / coords.width,
      y: coords.y / coords.height,
      text: "",
    };
    const next = [...stickyNotes, note];
    updatePageAnnotations(currentPage, { stickyNotes: next });
    saveAnnotations({ stickyNotes: next });
    broadcastAnnotations({ stickyNotes: next });
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

  function startNoteDrag(e, note, w, h) {
    e.stopPropagation();
    e.preventDefault();
    const coords = getCoords(e, w, h);
    if (!coords) return;
    setDragState({
      kind: "note",
      id: note.id,
      offsetX: note.x * coords.width - coords.x,
      offsetY: note.y * coords.height - coords.y,
    });
  }

  function addTextBox(e, w, h) {
    const coords = getCoords(e, w, h);
    if (!coords) return;
    const box = {
      id: `text_${Date.now()}`,
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

  function startTextDrag(e, box, w, h) {
    e.stopPropagation();
    e.preventDefault();
    const coords = getCoords(e, w, h);
    if (!coords) return;
    setDragState({
      kind: "text",
      id: box.id,
      offsetX: box.x * coords.width - coords.x,
      offsetY: box.y * coords.height - coords.y,
    });
  }

  function clearAll() {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
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

  // ───────────────────────────────────────────────────────────
  // Mouse handlers factory
  // ───────────────────────────────────────────────────────────
  function createMouseHandlers(w, h) {
    return {
      onMouseDown: (e) => {
        if (
          e.target.closest?.(".prep-sticky-note") ||
          e.target.closest?.(".prep-text-box")
        )
          return;
        if (tool === TOOL_TEXT) {
          e.preventDefault();
          if (activeTextId) {
            setActiveTextId(null);
            setTool(TOOL_NONE);
          } else addTextBox(e, w, h);
          return;
        }
        if ([TOOL_PEN, TOOL_HIGHLIGHTER, TOOL_ERASER].includes(tool)) {
          e.preventDefault();
          startDrawing(e, w, h);
        } else if (tool === TOOL_NOTE) {
          e.preventDefault();
          addNote(e, w, h);
        }
      },
      onMouseMove: (e) => {
        if (dragState) {
          e.preventDefault();
          draw(e, w, h);
          return;
        }
        if (tool === TOOL_POINTER) updatePointer(e, w, h);
        else if (pointerPos) {
          setPointerPos(null);
          broadcastPointer(null);
        }
        if ([TOOL_PEN, TOOL_HIGHLIGHTER, TOOL_ERASER].includes(tool)) {
          e.preventDefault();
          draw(e, w, h);
        }
      },
      onMouseUp: () => {
        stopDrawing();
        if (dragState) {
          setDragState(null);
          saveAnnotations();
          broadcastAnnotations();
        }
      },
      onMouseLeave: () => {
        stopDrawing();
        if (dragState) {
          setDragState(null);
        }
      },
    };
  }

  function setToolSafe(t) {
    if (tool === t) {
      setTool(TOOL_NONE);
      setPointerPos(null);
      broadcastPointer(null);
    } else {
      setTool(t);
      if (t !== TOOL_POINTER) {
        setPointerPos(null);
        broadcastPointer(null);
      }
    }
  }

  // ───────────────────────────────────────────────────────────
  // RENDER ANNOTATIONS - This is passed to PdfViewerWithSidebar
  // ───────────────────────────────────────────────────────────
  const renderAnnotations = useCallback(
    ({ width, height }) => {
      // Store size for coordinate calculations
      if (width !== pdfCanvasSize.width || height !== pdfCanvasSize.height) {
        setPdfCanvasSize({ width, height });
      }

      const handlers = createMouseHandlers(width, height);

      // Inline styles for annotation elements
      const canvasStyle = {
        position: "absolute",
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
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
      };

      const noteStyle = (note) => ({
        position: "absolute",
        left: `${note.x * 100}%`,
        top: `${note.y * 100}%`,
        transform: "translate(-5px, -5px)",
        minWidth: "140px",
        maxWidth: "220px",
        background: "#fef3c7",
        borderRadius: "4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        pointerEvents: "auto",
        zIndex: 20,
      });

      const noteHeaderStyle = {
        display: "flex",
        justifyContent: "flex-end",
        padding: "4px",
        background: "#fde68a",
        borderRadius: "4px 4px 0 0",
        cursor: "grab",
      };

      const noteCloseStyle = {
        width: "18px",
        height: "18px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "14px",
        color: "#92400e",
      };

      const noteTextareaStyle = {
        width: "100%",
        minHeight: "60px",
        padding: "8px",
        border: "none",
        background: "transparent",
        resize: "vertical",
        fontFamily: "inherit",
        fontSize: "13px",
      };

      const textLabelStyle = (box) => ({
        position: "absolute",
        left: `${box.x * 100}%`,
        top: `${box.y * 100}%`,
        color: box.color,
        fontSize: "18px",
        fontWeight: "600",
        cursor: "grab",
        whiteSpace: "nowrap",
        textShadow:
          "1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white",
        pointerEvents: "auto",
        zIndex: 20,
      });

      const textEditStyle = (box) => ({
        position: "absolute",
        left: `${box.x * 100}%`,
        top: `${box.y * 100}%`,
        minWidth: "120px",
        background: "white",
        borderRadius: "4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        pointerEvents: "auto",
        zIndex: 20,
      });

      const textHeaderStyle = {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "4px",
        background: "#e5e7eb",
        borderRadius: "4px 4px 0 0",
        cursor: "grab",
      };

      const textTextareaStyle = (color) => ({
        width: "100%",
        minHeight: "30px",
        padding: "6px",
        border: "none",
        background: "transparent",
        color: color,
        fontSize: "18px",
        fontWeight: "600",
        resize: "both",
        fontFamily: "inherit",
      });

      const pointerStyle = {
        position: "absolute",
        left: `${pointerPos?.x || 0}px`,
        top: `${pointerPos?.y || 0}px`,
        width: 0,
        height: 0,
        borderLeft: "12px solid #ef4444",
        borderTop: "8px solid transparent",
        borderBottom: "8px solid transparent",
        transform: "translate(-2px, -8px)",
        pointerEvents: "none",
        zIndex: 30,
      };

      return (
        <>
          {/* Drawing canvas */}
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={canvasStyle}
            onMouseDown={handlers.onMouseDown}
            onMouseMove={handlers.onMouseMove}
            onMouseUp={handlers.onMouseUp}
            onMouseLeave={handlers.onMouseLeave}
          />

          {/* Sticky notes */}
          {stickyNotes.map((note) => (
            <div
              key={note.id}
              className="prep-sticky-note"
              style={noteStyle(note)}
            >
              <div
                style={noteHeaderStyle}
                onMouseDown={(e) => startNoteDrag(e, note, width, height)}
              >
                <button
                  type="button"
                  style={noteCloseStyle}
                  onClick={() => deleteNote(note.id)}
                >
                  ×
                </button>
              </div>
              <textarea
                style={noteTextareaStyle}
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
            if (isEditing) {
              return (
                <div
                  key={box.id}
                  className="prep-text-box"
                  style={textEditStyle(box)}
                >
                  <div
                    style={textHeaderStyle}
                    onMouseDown={(e) => startTextDrag(e, box, width, height)}
                  >
                    <span
                      style={{
                        width: "20px",
                        height: "10px",
                        background:
                          "repeating-linear-gradient(0deg, #9ca3af, #9ca3af 2px, transparent 2px, transparent 4px)",
                      }}
                    />
                    <button
                      type="button"
                      style={noteCloseStyle}
                      onClick={() => deleteTextBox(box.id)}
                    >
                      ×
                    </button>
                  </div>
                  <textarea
                    data-textbox-id={box.id}
                    style={textTextareaStyle(box.color)}
                    placeholder="Type…"
                    value={box.text}
                    onChange={(e) => updateTextBoxText(box.id, e.target.value)}
                    onBlur={() => setActiveTextId(null)}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </div>
              );
            }
            return (
              <div
                key={box.id}
                className="prep-text-box"
                style={textLabelStyle(box)}
                onMouseDown={(e) => startTextDrag(e, box, width, height)}
                onDoubleClick={() => setActiveTextId(box.id)}
              >
                {box.text || "(empty)"}
              </div>
            );
          })}

          {/* Pointer */}
          {pointerPos && <div style={pointerStyle} />}
        </>
      );
    },
    [
      tool,
      penColor,
      stickyNotes,
      textBoxes,
      pointerPos,
      activeTextId,
      dragState,
      isDrawing,
      pdfCanvasSize,
      currentPage,
    ]
  );

  // ───────────────────────────────────────────────────────────
  // Non-PDF overlay (same logic but for iframes)
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPdf) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    function resize() {
      const rect = container.getBoundingClientRect();
      const prev =
        canvas.width && canvas.height ? canvas.toDataURL("image/png") : null;
      canvas.width = rect.width;
      canvas.height = rect.height;
      if (prev) {
        const img = new Image();
        img.onload = () => {
          canvas
            .getContext("2d")
            .drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = prev;
      }
    }
    resize();
    if (typeof ResizeObserver !== "undefined") {
      const obs = new ResizeObserver(resize);
      obs.observe(container);
      return () => obs.disconnect();
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
                  onClick={clearAll}
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
                  <div
                    className="prep-viewer__canvas-container"
                    style={{ height: "100%", display: "flex" }}
                  >
                    <PdfViewerWithSidebar
                      ref={pdfViewerRef}
                      fileUrl={viewerUrl}
                      onFatalError={() => setPdfFallback(true)}
                      onPageChange={handlePageChange}
                      onCanvasSizeChange={handleCanvasSizeChange}
                      renderAnnotations={renderAnnotations}
                    />
                  </div>
                ) : (
                  <div
                    className="prep-viewer__canvas-container"
                    ref={containerRef}
                    style={{ position: "relative" }}
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
                    {/* Non-PDF annotations rendered here - TODO: similar pattern */}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="prep-viewer__placeholder">
              <h2>No preview available</h2>
              <p>This resource doesn&apos;t have an embeddable URL.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
