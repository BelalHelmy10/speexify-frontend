// app/resources/prep/PrepShell.jsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PrepBreadcrumbs from "./PrepBreadcrumbs";
import PrepInfoSidebar from "./PrepInfoSidebar";
import PrepViewerFrame from "./PrepViewerFrame";
import PrepToolbar from "./PrepToolbar";
import PrepAnnotationsOverlay from "./PrepAnnotationsOverlay";
import PrepClearConfirmModal from "./PrepClearConfirmModal";
import {
  TOOL_NONE,
  TOOL_PEN,
  TOOL_HIGHLIGHTER,
  TOOL_NOTE,
  TOOL_POINTER,
  TOOL_ERASER,
  TOOL_TEXT,
  TOOL_MASK,
  TOOL_LINE,
  TOOL_BOX,
  TOOL_SELECT,
  STROKE_WIDTH_OPTIONS,
  PEN_COLORS,
  clamp,
  getDetectedShape,
  drawStrokesOnContext,
  exportAnnotationsAsPng,
} from "./prepAnnotationUtils";
import { handlePrepChannelMessage } from "./prepRealtimeSync";
import {
  buildPrepAudioTracks,
  getPrepCurrentToolIcon,
  getPrepCurrentToolLabel,
} from "./prepViewModel";
import {
  startPrepDrawing,
  drawPrepStrokeOrDrag,
  stopPrepDrawing,
} from "./prepDrawingLogic";
import {
  savePrepAnnotations,
  schedulePrepBroadcastAnnotations,
  schedulePrepSaveAnnotations,
  broadcastPrepAnnotations,
  broadcastPrepPointer,
  broadcastPrepPdfFitToPage,
  applyPrepRemoteAnnotations,
} from "./prepPersistenceLogic";
import { findPrepItemAtPoint, erasePrepAtPoint } from "./prepEraserLogic";
import {
  createPrepTextBox,
  updatePrepTextBoxText,
  deletePrepTextBox,
  startPrepTextDrag,
  startPrepFontSizeResize,
  handlePrepFontSizeResize,
  stopPrepFontSizeResize,
  startPrepWidthResize,
  handlePrepWidthResize,
  stopPrepWidthResize,
} from "./prepTextBoxLogic";
import {
  createPrepStickyNote,
  updatePrepStickyNoteText,
  deletePrepStickyNote,
  startPrepNoteDrag,
} from "./prepNoteLogic";
import {
  startPrepMaskMove,
  deletePrepMask,
  finalizePrepCreatingMask,
  finalizePrepCreatingShape,
} from "./prepMaskShapeLogic";
import {
  handlePrepSelectionPointerDown,
  handlePrepGroupDragMove,
  handlePrepSelectionBoxMove,
  finalizePrepGroupDrag,
  finalizePrepSelectionBox,
  deleteSelectedPrepItems,
} from "./prepSelectionLogic";
import {
  openPrepClearConfirm,
  closePrepClearConfirm,
  confirmPrepClearAll,
} from "./prepClearLogic";
import {
  getPrepNormalizedPoint,
  getPrepCanvasCoordinates,
  handlePrepTouchStartGesture,
  handlePrepGestureMove,
  handlePrepMouseDown,
  handlePrepMouseMove,
  handlePrepMouseUp,
  setPrepToolSafe,
} from "./prepInputHandlers";
import { getDictionary, t } from "@/app/i18n";
import useAuth from "@/hooks/useAuth";

export default function PrepShell({
  resource,
  viewer,
  hideSidebar = false,
  hideBreadcrumbs = false,
  classroomChannel,
  isScreenShareActive = false,
  screenShareStream = null,
  isTeacher = false,
  locale = "en",
}) {
  const dict = getDictionary(locale, "resources");
  const prefix = locale === "ar" ? "/ar" : "";

  // ✅ Auth hook must be called before any early returns (React Rules of Hooks)
  const { user } = useAuth();
  const myUserId = user?._id || user?.id || null;

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

  const storageKey = `prep_annotations_${resource._id}`;

  // ✅ define viewerUrl FIRST
  const viewerUrl = viewer?.viewerUrl || null;

  // ✅ then define isPdf/pdfViewerUrl
  const isPdf = viewer?.type === "pdf";
  const pdfViewerUrl = isPdf ? viewerUrl : null;

  const [focusMode, setFocusMode] = useState(false);
  const [tool, setTool] = useState(TOOL_NONE);
  const [isDrawing, setIsDrawing] = useState(false);
  // Teacher pointer is now per-page
  const [teacherPointerByPage, setTeacherPointerByPage] = useState({});
  // shape: { [pageNumber]: { x, y } }

  // Learner pointers are now per-page, per-user
  const [learnerPointersByPage, setLearnerPointersByPage] = useState({});
  // shape: { [pageNumber]: { [userId]: { x, y } } }

  const [stickyNotes, setStickyNotes] = useState([]);
  const [textBoxes, setTextBoxes] = useState([]);
  const [masks, setMasks] = useState([]); // white blocks to hide content
  const [lines, setLines] = useState([]); // [{id, x1, y1, x2, y2, color, page}]
  const [boxes, setBoxes] = useState([]); // [{id, x, y, width, height, color, page}]
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [dragState, setDragState] = useState(null); // { kind: "note"|"text", id, offsetX, offsetY }
  const [resizeState, setResizeState] = useState(null); // { id, startY, startFontSize }
  const [widthResizeState, setWidthResizeState] = useState(null); // { id, startX, startWidth, direction }
  const [maskDrag, setMaskDrag] = useState(null); // { mode: "creating"|"moving", ... }
  const [shapeDrag, setShapeDrag] = useState(null); // { mode: "creating", tool: "line"|"box", startX, startY, currentX, currentY }
  const [activeTextId, setActiveTextId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // P0-4: Text Box Focus Fix - Debounce blur to prevent accidental deactivation
  // P0-5: Clear All Confirmation Modal
  // ─────────────────────────────────────────────────────────────
  const blurDebounceRef = useRef(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // P1 FEATURE STATE
  // ─────────────────────────────────────────────────────────────
  // P1-7: Track if last input was touch for larger hit areas
  const [lastInputWasTouch, setLastInputWasTouch] = useState(false);

  // P1-10: Pointer persistence timeout ref


  // P1-11: Stroke width for pen tool
  const [penStrokeWidth, setPenStrokeWidth] = useState(3);
  const [showWidthPicker, setShowWidthPicker] = useState(false);
  const widthPickerRef = useRef(null);

  // Smart Toolbar: Dropdown menu state
  const [drawMenuOpen, setDrawMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const drawMenuRef = useRef(null);
  const moreMenuRef = useRef(null);

  // P1-6: Selection tool state
  const [selectedItems, setSelectedItems] = useState([]); // [{type: 'stroke'|'note'|'text'|'mask'|'line'|'box', id: string}]
  const [selectionBox, setSelectionBox] = useState(null); // {startX, startY, currentX, currentY} for box selection
  const [groupDrag, setGroupDrag] = useState(null); // {startX, startY, initialItems: Map<id, item>}
  const [showGrid, setShowGrid] = useState(false); // P2-14: Grid Toggle

  // P2-17: Zoom/Pan Viewport
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const gestureRef = useRef({
    startDist: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    initialViewport: { x: 0, y: 0 },
    active: false
  });


  // P1-8: Palm rejection - track active stylus to ignore palm touches
  const activeStylusRef = useRef(false);
  const palmRejectionTimeoutRef = useRef(null);

  // ✅ Track container width for proportional scaling of annotations
  // Reference width is 800px (typical desktop PDF viewer width)
  const [containerWidth, setContainerWidth] = useState(800);
  const REFERENCE_WIDTH = 800; // Font sizes are designed for this width
  const annotationScale = containerWidth / REFERENCE_WIDTH;

  // PDF page tracking for per-page annotations
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);

  const handlePdfNavStateChange = useCallback((navState) => {
    if (!navState) return;

    // ✅ store full API so learners can be forced to page/position
    pdfNavApiRef.current = navState;

    if (navState.currentPage) {
      setPdfCurrentPage(navState.currentPage);
    }
  }, []);

  // ✅ Pointer must be tied to the current PDF page.
  // When the page changes, clear local pointer for previous page so it doesn't "travel".
  const prevPointerPageRef = useRef(null);

  // ✅ PDF scroll/page sync refs (teacher -> learners)
  const pdfScrollRef = useRef(null); // scroll container (mainRef inside PdfViewerWithSidebar)
  const pdfNavApiRef = useRef(null); // nav API from PdfViewerWithSidebar (setPage, etc.)
  const lastScrollSentAtRef = useRef(0); // throttle
  const rafPendingRef = useRef(false); // throttle (rAF)

  const applyingRemoteRef = useRef(false);

  useEffect(() => {
    const page = isPdf ? pdfCurrentPage : 1;
    const prevPage = prevPointerPageRef.current;

    if (prevPage !== null && prevPage !== page) {
      if (isTeacher) {
        setTeacherPointerByPage((prev) => {
          const next = { ...prev };
          delete next[prevPage];
          return next;
        });
        broadcastPointer(null);
      } else if (myUserId) {
        setLearnerPointersByPage((prev) => {
          const next = { ...prev };
          if (!next[prevPage]) return next;
          const perPage = { ...next[prevPage] };
          delete perPage[myUserId];
          if (Object.keys(perPage).length === 0) delete next[prevPage];
          else next[prevPage] = perPage;
          return next;
        });
        broadcastPointer(null);
      }
    }

    prevPointerPageRef.current = page;
  }, [isPdf, pdfCurrentPage, isTeacher, myUserId]);

  // stroke: { id, tool, color, points: [{ x,y } in [0,1]] }
  const [strokes, setStrokes] = useState([]);
  const [currentStrokeId, setCurrentStrokeId] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // UNDO/REDO HISTORY SYSTEM
  // ─────────────────────────────────────────────────────────────
  const MAX_HISTORY_SIZE = 50;
  const [historyStack, setHistoryStack] = useState([]); // past states
  const [redoStack, setRedoStack] = useState([]); // future states for redo
  const historyRef = useRef(historyStack);
  const redoRef = useRef(redoStack);

  // Keep refs in sync
  useEffect(() => {
    historyRef.current = historyStack;
  }, [historyStack]);
  useEffect(() => {
    redoRef.current = redoStack;
  }, [redoStack]);

  // ✅ Refs to hold latest state values (avoids stale closures in async callbacks)
  const strokesRef = useRef(strokes);
  const stickyNotesRef = useRef(stickyNotes);
  const textBoxesRef = useRef(textBoxes);
  const masksRef = useRef(masks);
  const linesRef = useRef(lines);
  const boxesRef = useRef(boxes);

  // Keep refs in sync with state
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);
  useEffect(() => {
    stickyNotesRef.current = stickyNotes;
  }, [stickyNotes]);
  useEffect(() => {
    textBoxesRef.current = textBoxes;
  }, [textBoxes]);
  useEffect(() => {
    masksRef.current = masks;
  }, [masks]);
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);
  useEffect(() => {
    boxesRef.current = boxes;
  }, [boxes]);

  const canvasRef = useRef(null);
  const containerRef = useRef(null); // element that matches the page (for normalized coords)
  const screenVideoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const el = screenVideoRef.current;
    if (!el) return;

    const stream =
      screenShareStream && typeof screenShareStream.getTracks === "function"
        ? screenShareStream
        : null;

    if (!stream) {
      if (el.srcObject) {
        el.srcObject = null;
      }
      return;
    }

    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [screenShareStream]);

  // ✅ TEXTAREA REFS (for real-time autosize)
  const textAreaRefs = useRef({}); // { [textId]: HTMLTextAreaElement }
  const measureSpanRef = useRef(null); // shared measurer for auto width

  // ✅ AUDIO SYNC (teacher -> learners)
  const audioSeqRef = useRef(0); // monotonically increasing sequence (teacher)
  const lastAppliedAudioSeqRef = useRef(-1); // last seq applied (learner)
  const lastAudioStateRef = useRef(null); // last received AUDIO_STATE for drift correction
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const audioUnlockedRef = useRef(false); // track if audio has been pre-unlocked on this device
  const channelReady = !!classroomChannel?.ready;
  const sendOnChannel = classroomChannel?.send;
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // ✅ PRE-UNLOCK AUDIO ON FIRST USER INTERACTION (fixes mobile autoplay)
  // Mobile browsers require user interaction before audio can play.
  // This effect listens for the first touch/click and "warms up" the audio.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isTeacher) return; // Only needed for learners
    if (audioUnlockedRef.current) return; // Already unlocked

    const unlockAudio = () => {
      if (audioUnlockedRef.current) return;

      const el = audioRef.current;
      if (!el) return;

      // Create a very short silent audio context to unlock audio
      try {
        // Method 1: Use AudioContext (works on most browsers)
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
          // Also resume context if suspended
          if (ctx.state === "suspended") {
            ctx.resume();
          }
        }
      } catch (e) {
        // Ignore AudioContext errors
      }

      // Method 2: Try to play the actual audio element briefly (muted)
      try {
        const wasMuted = el.muted;
        const wasVolume = el.volume;
        el.muted = true;
        el.volume = 0;

        const playPromise = el.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            el.pause();
            el.currentTime = 0;
            el.muted = wasMuted;
            el.volume = wasVolume;
            audioUnlockedRef.current = true;
            setNeedsAudioUnlock(false);
          }).catch(() => {
            el.muted = wasMuted;
            el.volume = wasVolume;
            // If this fails, the unlock button will still show
          });
        }
      } catch (e) {
        // Ignore play errors
      }

      audioUnlockedRef.current = true;
    };

    // Listen for first interaction
    const events = ["touchstart", "touchend", "click", "keydown"];
    events.forEach((evt) => {
      document.addEventListener(evt, unlockAudio, { once: true, passive: true });
    });

    return () => {
      events.forEach((evt) => {
        document.removeEventListener(evt, unlockAudio);
      });
    };
  }, [isTeacher]);

  const sendAudioState = useCallback(
    ({ trackIndex, time, playing } = {}) => {
      if (!channelReady || !sendOnChannel) return;
      if (!isTeacher) return;
      const el = audioRef.current;
      const nextTrack =
        typeof trackIndex === "number" ? trackIndex : currentTrackIndex;
      const nextTime =
        typeof time === "number"
          ? time
          : el && typeof el.currentTime === "number"
            ? el.currentTime
            : 0;
      const nextPlaying =
        typeof playing === "boolean" ? playing : el ? !el.paused : false;

      const seq = (audioSeqRef.current = (audioSeqRef.current || 0) + 1);

      sendOnChannel({
        type: "AUDIO_STATE",
        resourceId: resource._id,
        seq,
        sentAt: Date.now(),
        trackIndex: nextTrack,
        time: Math.max(0, nextTime),
        playing: !!nextPlaying,
      });
    },
    [channelReady, sendOnChannel, isTeacher, resource._id, currentTrackIndex]
  );

  const applyAudioState = useCallback((msg, { isSnapshot = false } = {}) => {
    const el = audioRef.current;
    if (!el || !msg) return;

    const seq = Number(msg.seq);
    if (Number.isFinite(seq) && seq <= lastAppliedAudioSeqRef.current) {
      return; // ignore old/out-of-order
    }
    if (Number.isFinite(seq)) lastAppliedAudioSeqRef.current = seq;

    const nextIndex = Number(msg.trackIndex) || 0;
    const baseTime = Number(msg.time) || 0;
    const sentAt = Number(msg.sentAt) || Date.now();
    const playing = !!msg.playing;

    setCurrentTrackIndex(nextIndex);

    // Compute latency-compensated target time
    const now = Date.now();
    const latencySec = Math.max(0, (now - sentAt) / 1000);
    const targetTime = Math.max(0, baseTime + (playing ? latencySec : 0));

    lastAudioStateRef.current = {
      trackIndex: nextIndex,
      time: baseTime,
      sentAt,
      playing,
    };

    const runAfterLoad = (fn) => {
      // readyState 1 means metadata loaded (duration/time available)
      if (el.readyState >= 1) {
        fn();
        return;
      }
      const onLoaded = () => {
        el.removeEventListener("loadedmetadata", onLoaded);
        fn();
      };
      el.addEventListener("loadedmetadata", onLoaded);
    };

    runAfterLoad(() => {
      try {
        el.currentTime = targetTime;
      } catch { }

      if (playing) {
        el.play().then(
          () => {
            setIsAudioPlaying(true);
            setNeedsAudioUnlock(false);
          },
          () => {
            // Autoplay may be blocked; user must click play once
            setIsAudioPlaying(false);
            setNeedsAudioUnlock(true);
          }
        );
      } else {
        try {
          el.pause();
        } catch { }
        setIsAudioPlaying(false);
      }
    });
  }, []);
  const toolMenuRef = useRef(null);
  const colorMenuRef = useRef(null);

  const unit = resource.unit;
  const subLevel = unit?.subLevel;
  const level = subLevel?.level;
  const track = level?.track;

  const hasScreenShare =
    !!isScreenShareActive &&
    !!(screenShareStream && typeof screenShareStream.getTracks === "function");

  const showSidebar = !hideSidebar && !sidebarCollapsed;
  const showBreadcrumbs = !hideBreadcrumbs;

  const layoutClasses =
    "prep-layout" +
    (focusMode || sidebarCollapsed || hideSidebar ? " prep-layout--focus" : "");

  // ─────────────────────────────────────────────────────────────
  // Text tool helpers:
  // - Auto-expand width while typing (single line growth)
  // - Wrap only when user manually resizes narrower
  // - Auto-resize textarea height in realtime (especially after width changes)
  // ─────────────────────────────────────────────────────────────

  const measureTextWidthPx = useCallback((text, style = {}) => {
    // Uses a hidden span to get exact rendered width.
    const span = measureSpanRef.current;
    if (!span) return 0;

    span.style.fontSize = style.fontSize ? `${style.fontSize}px` : "16px";
    span.style.fontFamily = style.fontFamily || "inherit";
    span.style.fontWeight = style.fontWeight || "normal";
    span.style.letterSpacing = style.letterSpacing || "normal";
    span.style.whiteSpace = "pre"; // IMPORTANT: no wrap
    // put at least one char so width isn't 0
    span.textContent = (text ?? "").length ? text : " ";
    return span.getBoundingClientRect().width || 0;
  }, []);

  const autoResizeTextarea = useCallback((id) => {
    const el = textAreaRefs.current?.[id];
    if (!el) return;

    // Height
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const autoFitTextBoxWidthIfNeeded = useCallback(
    (box, nextText) => {
      // Only auto-fit while editing AND the box is in autoWidth mode
      if (!box?.autoWidth) return box;
      const fontSize = box.fontSize || 13;
      const text = nextText ?? box.text ?? "";
      // Measure the actual text content width
      const measured = measureTextWidthPx(text, { fontSize });
      // padding + caret room + extra buffer
      const desired = measured + 40;
      // CHANGED: Increase max width significantly
      const container = containerRef.current || canvasRef.current;
      const rect = container?.getBoundingClientRect();
      const maxW = rect?.width ? Math.floor(rect.width * 0.95) : 8000;
      const oldWidth = box.width || 120;
      let newWidth = clamp(Math.round(desired), 100, maxW);
      let newX = box.x;

      // ✅ Directional expansion based on text direction
      // LTR: anchor left edge, expand right (x stays fixed relative to left edge)
      // RTL: anchor right edge, expand left (x stays fixed relative to right edge)
      const isRTL = box.dir === "rtl";

      if (rect && newWidth !== oldWidth) {
        const widthDelta = newWidth - oldWidth;
        const normDelta = widthDelta / rect.width;

        if (isRTL) {
          // RTL: Anchor right edge - shift x LEFT as width increases
          // The right edge position = x + width/2 (in normalized coords)
          // To keep right edge fixed, new x = x - widthDelta/2
          newX = box.x - normDelta / 2;
        } else {
          // LTR: Anchor left edge - shift x RIGHT as width increases  
          // The left edge position = x - width/2 (in normalized coords)
          // To keep left edge fixed, new x = x + widthDelta/2
          newX = box.x + normDelta / 2;
        }

        // Clamp to container bounds
        const normW = newWidth / rect.width;
        const half = normW / 2;
        const projectedLeft = newX - half;
        const projectedRight = newX + half;
        if (projectedLeft < 0) {
          newX = half; // Clamp left at 0
        }
        if (projectedRight > 1) {
          newX = 1 - half; // Clamp right at 1
        }
      }
      return { ...box, x: newX, width: newWidth };
    },
    [measureTextWidthPx]
  );

  // ─────────────────────────────────────────────────────────────
  // P0-4: DEBOUNCED TEXT BOX BLUR HANDLER
  // Prevents accidental deactivation during resize/drag and auto-saves
  // ─────────────────────────────────────────────────────────────
  const handleTextBoxBlur = useCallback(
    (boxId) => {
      // Clear any pending blur timeout
      if (blurDebounceRef.current) {
        clearTimeout(blurDebounceRef.current);
      }

      // Debounce the blur - 300ms delay allows for click-and-continue interactions
      blurDebounceRef.current = setTimeout(() => {
        // Don't blur if resize/drag is in progress - prevents accidental focus loss
        if (resizeState?.id === boxId || widthResizeState?.id === boxId || dragState?.id === boxId) {
          return;
        }

        // Auto-save content before deactivating
        const currentBox = textBoxesRef.current.find((b) => b.id === boxId);
        if (currentBox) {
          // Persist and broadcast current state
          scheduleSaveAnnotations({ textBoxes: textBoxesRef.current });
          scheduleBroadcastAnnotations({ textBoxes: textBoxesRef.current });
        }

        // Now safe to deactivate
        setActiveTextId((currentId) => (currentId === boxId ? null : currentId));
      }, 300);
    },
    [resizeState, widthResizeState, dragState]
  );

  // Cleanup blur timeout on unmount
  useEffect(() => {
    return () => {
      if (blurDebounceRef.current) {
        clearTimeout(blurDebounceRef.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // UNDO/REDO FUNCTIONS
  // ─────────────────────────────────────────────────────────────

  // Capture current annotation state as a snapshot
  const getAnnotationSnapshot = useCallback(() => {
    return {
      strokes: strokesRef.current,
      stickyNotes: stickyNotesRef.current,
      textBoxes: textBoxesRef.current,
      masks: masksRef.current,
      lines: linesRef.current,
      boxes: boxesRef.current,
    };
  }, []);

  // Push current state to history before making changes
  const pushHistory = useCallback(() => {
    const snapshot = getAnnotationSnapshot();
    setHistoryStack((prev) => {
      const next = [...prev, snapshot];
      // Limit history size to prevent memory bloat
      if (next.length > MAX_HISTORY_SIZE) {
        return next.slice(next.length - MAX_HISTORY_SIZE);
      }
      return next;
    });
    // Clear redo stack when new action is performed
    setRedoStack([]);
  }, [getAnnotationSnapshot]);

  // Undo: restore previous state
  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;

    // Save current state to redo stack
    const currentSnapshot = getAnnotationSnapshot();
    setRedoStack((prev) => [...prev, currentSnapshot]);

    // Pop last state from history and restore
    setHistoryStack((prev) => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const lastState = newHistory.pop();

      if (lastState) {
        // Restore all annotation state
        setStrokes(lastState.strokes || []);
        setStickyNotes(lastState.stickyNotes || []);
        setTextBoxes(lastState.textBoxes || []);
        setMasks(lastState.masks || []);
        setLines(lastState.lines || []);
        setBoxes(lastState.boxes || []);

        // Persist and broadcast
        scheduleSaveAnnotations(lastState);
        scheduleBroadcastAnnotations(lastState);
      }

      return newHistory;
    });
  }, [getAnnotationSnapshot]);

  // Redo: restore forward state
  const redo = useCallback(() => {
    if (redoRef.current.length === 0) return;

    // Save current state to history stack
    const currentSnapshot = getAnnotationSnapshot();
    setHistoryStack((prev) => [...prev, currentSnapshot]);

    // Pop from redo stack and restore
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const newRedo = [...prev];
      const nextState = newRedo.pop();

      if (nextState) {
        // Restore all annotation state
        setStrokes(nextState.strokes || []);
        setStickyNotes(nextState.stickyNotes || []);
        setTextBoxes(nextState.textBoxes || []);
        setMasks(nextState.masks || []);
        setLines(nextState.lines || []);
        setBoxes(nextState.boxes || []);

        // Persist and broadcast
        scheduleSaveAnnotations(nextState);
        scheduleBroadcastAnnotations(nextState);
      }

      return newRedo;
    });
  }, [getAnnotationSnapshot]);

  // When active textbox changes or textBoxes update, resize the active textarea height
  useEffect(() => {
    if (!activeTextId) return;
    // next tick so DOM has updated widths
    const id = activeTextId;
    const t = setTimeout(() => autoResizeTextarea(id), 0);
    return () => clearTimeout(t);
  }, [activeTextId, textBoxes, autoResizeTextarea]);

  // ─────────────────────────────────────────────────────────────
  // Focus newly-activated text box
  // ─────────────────────────────────────────────────────────────

  // ✅ Teacher: broadcast PDF page changes
  useEffect(() => {
    if (!isPdf) return;
    if (!isTeacher) return;
    if (!channelReady || !sendOnChannel) return;

    sendOnChannel({
      type: "PDF_SET_PAGE",
      resourceId: resource._id,
      page: pdfCurrentPage,
    });
  }, [
    isPdf,
    isTeacher,
    channelReady,
    sendOnChannel,
    resource._id,
    pdfCurrentPage,
  ]);

  // ✅ Teacher: broadcast PDF scroll position (normalized)
  useEffect(() => {
    if (!isPdf) return;
    if (!isTeacher) return;
    if (!channelReady || !sendOnChannel) return;

    const el = pdfScrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const now = Date.now();
      if (now - lastScrollSentAtRef.current < 16) return; // ~60fps
      if (rafPendingRef.current) return;

      rafPendingRef.current = true;

      requestAnimationFrame(() => {
        rafPendingRef.current = false;

        const target = pdfScrollRef.current;
        if (!target) return;

        const maxScroll = Math.max(
          1,
          target.scrollHeight - target.clientHeight
        );
        const scrollNorm = target.scrollTop / maxScroll;

        lastScrollSentAtRef.current = Date.now();

        sendOnChannel({
          type: "PDF_SCROLL",
          resourceId: resource._id,
          page: pdfCurrentPage,
          scrollNorm,
        });
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [
    isPdf,
    isTeacher,
    channelReady,
    sendOnChannel,
    resource._id,
    pdfCurrentPage,
  ]);

  useEffect(() => {
    if (!activeTextId) return;
    const el = document.querySelector(`[data-textbox-id="${activeTextId}"]`);
    if (el) el.focus();
  }, [activeTextId]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    // Fix #21: Separate handlers for ended and pause
    const handleEnded = () => {
      setIsAudioPlaying(false);
      // Audio track finished completely
    };

    const handlePause = () => {
      // Only update state if not seeking (paused explicitly)
      if (!audioEl.seeking) {
        setIsAudioPlaying(false);
      }
    };

    audioEl.addEventListener("ended", handleEnded);
    audioEl.addEventListener("pause", handlePause);

    return () => {
      audioEl.removeEventListener("ended", handleEnded);
      audioEl.removeEventListener("pause", handlePause);
    };
  }, [resource._id]);

  // ✅ Teacher: periodically broadcast audio state while playing (keeps learners in sync)
  useEffect(() => {
    if (!isTeacher) return;
    if (!channelReady || !sendOnChannel) return;
    if (!isAudioPlaying) return;

    const id = setInterval(() => {
      const el = audioRef.current;
      if (!el) return;
      if (el.paused) return;
      sendAudioState({ time: el.currentTime || 0, playing: true });
    }, 750);

    return () => clearInterval(id);
  }, [isTeacher, channelReady, sendOnChannel, isAudioPlaying, sendAudioState]);

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

      // P1-11: Close width picker on click outside
      if (widthPickerRef.current && !widthPickerRef.current.contains(e.target)) {
        setShowWidthPicker(false);
      }

      // Close smart toolbar menus on click outside
      if (drawMenuRef.current && !drawMenuRef.current.contains(e.target)) {
        setDrawMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []); // Refs are stable, no need to include in deps

  // ─────────────────────────────────────────────────────────────
  // KEYBOARD SHORTCUTS (P0-3: Undo/Redo + Tool switching)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      // Skip if user is typing in an input/textarea
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      const isMac = navigator.platform?.toUpperCase().includes("MAC");
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Cmd+Z / Ctrl+Z
      if (cmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Cmd+Shift+Z / Ctrl+Shift+Z or Ctrl+Y
      if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        redo();
        return;
      }
      if (cmdOrCtrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      // Tool shortcuts (only when not holding modifiers)
      if (cmdOrCtrl || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "p":
          e.preventDefault();
          setToolSafe(TOOL_PEN);
          break;
        case "h":
          e.preventDefault();
          setToolSafe(TOOL_HIGHLIGHTER);
          break;
        case "e":
          e.preventDefault();
          setToolSafe(TOOL_ERASER);
          break;
        case "t":
          e.preventDefault();
          setToolSafe(TOOL_TEXT);
          break;
        case "n":
          e.preventDefault();
          setToolSafe(TOOL_NOTE);
          break;
        case "l":
          e.preventDefault();
          setToolSafe(TOOL_POINTER);
          break;
        case "m":
          e.preventDefault();
          setToolSafe(TOOL_MASK);
          break;
        case "1":
          e.preventDefault();
          setToolSafe(TOOL_LINE);
          break;
        case "2":
          e.preventDefault();
          setToolSafe(TOOL_BOX);
          break;
        // P1-6: Selection tool shortcuts
        case "v":
        case "s":
          e.preventDefault();
          setToolSafe(TOOL_SELECT);
          break;
        case "escape":
          e.preventDefault();
          setToolSafe(TOOL_NONE);
          setActiveTextId(null);
          // P1-6: Clear selection on Escape
          setSelectedItems([]);
          setSelectionBox(null);
          break;
        case "delete":
        case "backspace":
          // P1-6: Delete selected items
          if (selectedItems.length > 0) {
            e.preventDefault();
            deleteSelectedItems();
          }
          break;
        default:
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // ─────────────────────────────────────────────────────────────
  // Utility: normalized point relative to containerRef
  // ─────────────────────────────────────────────────────────────
  function getNormalizedPoint(event) {
    return getPrepNormalizedPoint(event, {
      containerRef,
      showGrid,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Canvas coordinate helpers (for dragging notes/text)
  // ─────────────────────────────────────────────────────────────
  function getCanvasCoordinates(event) {
    return getPrepCanvasCoordinates(event, {
      containerRef,
      canvasRef,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // REDRAW + EXPORT: legacy bitmap rendering helpers
  // ─────────────────────────────────────────────────────────────
  function handleExport() {
    exportAnnotationsAsPng({
      canvas: canvasRef.current,
      isPdf,
      pdfCurrentPage,
      strokes,
      lines,
      boxes,
      textBoxes,
      penColor,
    });
  }

  // REDRAW: render all strokes (normalized) onto canvas (legacy bitmap)
  function redrawCanvasFromStrokes(strokesToDraw) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStrokesOnContext(ctx, strokesToDraw, canvas.width, canvas.height, {
      penColor,
    });
  }

  useEffect(() => {
    const visibleStrokes = isPdf
      ? strokes.filter((s) => (s.page ?? 1) === pdfCurrentPage)
      : strokes;

    redrawCanvasFromStrokes(visibleStrokes);
  }, [strokes, isPdf, pdfCurrentPage]);

  // ─────────────────────────────────────────────────────────────
  // Load annotations from localStorage
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!storageKey) return;
    // ✅ Reset state when switching resources/materials
    setStickyNotes([]);
    setTextBoxes([]);
    setMasks([]);
    setLines([]);
    setBoxes([]);
    setStrokes([]);
    setCurrentStrokeId(null);
    // Also clear the canvas immediately so nothing "sticks"
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx)
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      // ✅ If no saved annotations for this resource, we keep the reset (empty) state
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.stickyNotes)) setStickyNotes(parsed.stickyNotes);
      if (Array.isArray(parsed.textBoxes)) setTextBoxes(parsed.textBoxes);
      if (Array.isArray(parsed.masks)) setMasks(parsed.masks);
      if (Array.isArray(parsed.lines)) setLines(parsed.lines);
      if (Array.isArray(parsed.boxes)) setBoxes(parsed.boxes);
      if (Array.isArray(parsed.strokes)) {
        setStrokes(
          parsed.strokes.filter(
            (s) => s.tool === TOOL_PEN || s.tool === TOOL_HIGHLIGHTER
          )
        );
      } else if (parsed.canvasData && canvasRef.current) {
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

      // Avoid state churn when width has not changed.
      setContainerWidth((prev) => (Math.abs(prev - rect.width) > 0.5 ? rect.width : prev));

      canvas.width = rect.width;
      canvas.height = rect.height;

      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const visibleStrokes = isPdf
        ? strokes.filter((s) => (s.page ?? 1) === pdfCurrentPage)
        : strokes;

      redrawCanvasFromStrokes(visibleStrokes);
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
  }, [hasScreenShare, isPdf, pdfCurrentPage]);

  // ─────────────────────────────────────────────────────────────
  // Persistence + broadcasting
  // ─────────────────────────────────────────────────────────────
  const saveDebounceRef = useRef(null);
  const pendingSaveRef = useRef({});

  function saveAnnotations(opts = {}, saveOpts = { includeCanvas: false }) {
    savePrepAnnotations(opts, saveOpts, {
      storageKey,
      canvasRef,
      strokesRef,
      stickyNotesRef,
      textBoxesRef,
      masksRef,
      linesRef,
      boxesRef,
    });
  }

  const pendingBroadcastRef = useRef({});
  const broadcastRafRef = useRef(false);

  function scheduleBroadcastAnnotations(partial = {}) {
    schedulePrepBroadcastAnnotations(partial, {
      pendingBroadcastRef,
      broadcastRafRef,
      broadcastAnnotations,
    });
  }

  function scheduleSaveAnnotations(partial = {}) {
    schedulePrepSaveAnnotations(partial, {
      pendingSaveRef,
      saveDebounceRef,
      saveAnnotations,
    });
  }

  function broadcastAnnotations(custom = {}, opts = { includeCanvas: false }) {
    broadcastPrepAnnotations(custom, opts, {
      channelReady,
      sendOnChannel,
      applyingRemoteRef,
      resourceId: resource._id,
      canvasRef,
      strokesRef,
      stickyNotesRef,
      textBoxesRef,
      masksRef,
      linesRef,
      boxesRef,
    });
  }

  function broadcastPointer(normalizedPosOrNull) {
    broadcastPrepPointer(normalizedPosOrNull, {
      channelReady,
      sendOnChannel,
      applyingRemoteRef,
      isPdf,
      pdfCurrentPage,
      isTeacher,
      resourceId: resource._id,
      myUserId,
      user,
    });
  }

  function broadcastPdfFitToPage() {
    broadcastPrepPdfFitToPage({
      channelReady,
      sendOnChannel,
      isTeacher,
      isPdf,
      applyingRemoteRef,
      resourceId: resource._id,
      pdfCurrentPage,
    });
  }

  function applyRemoteAnnotationState(message) {
    applyPrepRemoteAnnotations(message, {
      resourceId: resource._id,
      canvasRef,
      applyingRemoteRef,
      setStickyNotes,
      setTextBoxes,
      setMasks,
      setLines,
      setBoxes,
      setStrokes,
      scheduleSaveAnnotations,
      strokesRef,
      stickyNotesRef,
      textBoxesRef,
      masksRef,
      linesRef,
      boxesRef,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Subscribe to classroom channel (for sync)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!classroomChannel?.ready) return;
    if (typeof classroomChannel?.subscribe !== "function") return;

    const unsubscribe = classroomChannel.subscribe((msg) => {
      handlePrepChannelMessage(msg, {
        resourceId: resource._id,
        applyRemoteAnnotationState,
        setTeacherPointerByPage,
        setLearnerPointersByPage,
        isTeacher,
        isPdf,
        pdfCurrentPage,
        pdfNavApiRef,
        pdfScrollRef,
        applyAudioState,
        audioRef,
        setCurrentTrackIndex,
        setIsAudioPlaying,
      });
    });

    return unsubscribe;
  }, [
    classroomChannel?.ready,
    classroomChannel?.subscribe,
    resource._id,
    isTeacher,
    isPdf,
    pdfCurrentPage,
    applyAudioState,
  ]);

  // ─────────────────────────────────────────────────────────────
  // Drawing tools (pen / highlighter / eraser) using normalized coords
  // ─────────────────────────────────────────────────────────────
  // Helper to find top-most item at a normalized point (P1-6)
  function findItemAtPoint(p) {
    return findPrepItemAtPoint(p, {
      isPdf,
      pdfCurrentPage,
      lastInputWasTouch,
      strokes,
      lines,
      boxes,
      textBoxes,
      stickyNotes,
      masks,
      containerRef,
    });
  }

  function eraseAtPoint(e) {
    erasePrepAtPoint(e, {
      getNormalizedPoint,
      pushHistory,
      isPdf,
      pdfCurrentPage,
      lastInputWasTouch,
      strokes,
      lines,
      boxes,
      textBoxes,
      stickyNotes,
      masks,
      containerRef,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
      setStrokes,
      setLines,
      setBoxes,
      setTextBoxes,
      setStickyNotes,
      setMasks,
      activeTextId,
      setActiveTextId,
      textAreaRefs,
    });
  }

  function startDrawing(e) {
    startPrepDrawing(e, {
      tool,
      setIsDrawing,
      eraseAtPoint,
      getNormalizedPoint,
      pushHistory,
      penColor,
      isPdf,
      pdfCurrentPage,
      penStrokeWidth,
      setStrokes,
      setCurrentStrokeId,
    });
  }

  function draw(e) {
    drawPrepStrokeOrDrag(e, {
      dragState,
      getCanvasCoordinates,
      setStickyNotes,
      setTextBoxes,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
      isDrawing,
      tool,
      eraseAtPoint,
      currentStrokeId,
      getNormalizedPoint,
      setStrokes,
    });
  }

  function stopDrawing() {
    stopPrepDrawing({
      isDrawing,
      dragState,
      maskDrag,
      currentStrokeId,
      tool,
      strokes,
      getDetectedShape,
      setStrokes,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
      setIsDrawing,
      setCurrentStrokeId,
      setDragState,
      setMaskDrag,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Sticky notes
  // ─────────────────────────────────────────────────────────────
  function handleClickForNote(e) {
    createPrepStickyNote(e, {
      tool,
      getCanvasCoordinates,
      isPdf,
      pdfCurrentPage,
      pushHistory,
      stickyNotes,
      setStickyNotes,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
    });
  }

  function updateNoteText(id, text) {
    updatePrepStickyNoteText(id, text, {
      stickyNotes,
      setStickyNotes,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
    });
  }

  function deleteNote(id) {
    deletePrepStickyNote(id, {
      stickyNotes,
      setStickyNotes,
      saveAnnotations,
      broadcastAnnotations,
    });
  }

  function startNoteDrag(e, note) {
    startPrepNoteDrag(e, note, {
      tool,
      getCanvasCoordinates,
      setDragState,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Text boxes
  // ─────────────────────────────────────────────────────────────
  function createTextBox(e) {
    createPrepTextBox(e, {
      getNormalizedPoint,
      penColor,
      isPdf,
      pdfCurrentPage,
      pushHistory,
      textBoxes,
      setTextBoxes,
      setActiveTextId,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
      autoResizeTextarea,
    });
  }

  function updateTextBoxText(id, text) {
    updatePrepTextBoxText(id, text, {
      setTextBoxes,
      autoFitTextBoxWidthIfNeeded,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
      autoResizeTextarea,
    });
  }

  function deleteTextBox(id) {
    deletePrepTextBox(id, {
      textBoxes,
      setTextBoxes,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
      activeTextId,
      setActiveTextId,
      textAreaRefs,
    });
  }

  function startTextDrag(e, box) {
    startPrepTextDrag(e, box, {
      tool,
      getCanvasCoordinates,
      setDragState,
    });
  }

  function startFontSizeResize(e, box) {
    startPrepFontSizeResize(e, box, {
      containerRef,
      canvasRef,
      setWidthResizeState,
      setTextBoxes,
      setResizeState,
    });
  }

  function handleFontSizeResize(e) {
    handlePrepFontSizeResize(e, {
      resizeState,
      setTextBoxes,
      measureTextWidthPx,
      autoFitTextBoxWidthIfNeeded,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
      autoResizeTextarea,
    });
  }

  function stopFontSizeResize() {
    stopPrepFontSizeResize({
      resizeState,
      setResizeState,
      saveAnnotations,
      broadcastAnnotations,
    });
  }

  function startWidthResize(e, box, direction) {
    startPrepWidthResize(e, box, direction, {
      containerRef,
      canvasRef,
      setWidthResizeState,
      setTextBoxes,
    });
  }

  function handleWidthResize(e) {
    handlePrepWidthResize(e, {
      widthResizeState,
      setTextBoxes,
      measureTextWidthPx,
      autoFitTextBoxWidthIfNeeded,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
      autoResizeTextarea,
    });
  }
  function stopWidthResize() {
    stopPrepWidthResize({
      widthResizeState,
      setWidthResizeState,
      saveAnnotations,
      broadcastAnnotations,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Mask blocks
  // ─────────────────────────────────────────────────────────────
  function startMaskMove(e, mask) {
    startPrepMaskMove(e, mask, {
      getNormalizedPoint,
      setMaskDrag,
    });
  }

  function deleteMask(id) {
    deletePrepMask(id, {
      setMasks,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
    });
  }

  function finalizeCreatingMask(endPoint) {
    finalizePrepCreatingMask(endPoint, {
      maskDrag,
      setMaskDrag,
      isPdf,
      pdfCurrentPage,
      pushHistory,
      setMasks,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
    });
  }

  function finalizeCreatingShape(endPoint) {
    finalizePrepCreatingShape(endPoint, {
      shapeDrag,
      setShapeDrag,
      isPdf,
      pdfCurrentPage,
      pushHistory,
      penColor,
      setLines,
      setBoxes,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // P0-5: Clear All with Confirmation Modal
  // ─────────────────────────────────────────────────────────────

  // Request clear - shows confirmation modal
  // P1-6: Delete selected items
  function deleteSelectedItems() {
    deleteSelectedPrepItems({
      selectedItems,
      pushHistory,
      strokes,
      stickyNotes,
      textBoxes,
      masks,
      lines,
      boxes,
      setStrokes,
      setStickyNotes,
      setTextBoxes,
      setMasks,
      setLines,
      setBoxes,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
      setSelectedItems,
      setSelectionBox,
    });
  }

  function requestClearAll() {
    openPrepClearConfirm(setShowClearConfirm);
  }

  // Cancel clear - hides confirmation modal
  function cancelClearAll() {
    closePrepClearConfirm(setShowClearConfirm);
  }

  // Confirmed clear - actually performs the clear (ONLY CURRENT PAGE when PDF)
  function confirmClearAll() {
    confirmPrepClearAll({
      setShowClearConfirm,
      pushHistory,
      isPdf,
      pdfCurrentPage,
      canvasRef,
      strokes,
      stickyNotes,
      textBoxes,
      masks,
      lines,
      boxes,
      setStrokes,
      setStickyNotes,
      setTextBoxes,
      setMasks,
      setLines,
      setBoxes,
      setDragState,
      setMaskDrag,
      setShapeDrag,
      setActiveTextId,
      setTeacherPointerByPage,
      setLearnerPointersByPage,
      storageKey,
      broadcastAnnotations,
      broadcastPointer,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Mouse handlers
  // ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  // P2-17: Touch Gesture Handlers (Zoom/Pan)
  // ─────────────────────────────────────────────────────────────
  function handleTouchStartGesture(e) {
    return handlePrepTouchStartGesture(e, {
      gestureRef,
      viewport,
    });
  }

  function handleGestureMove(e) {
    handlePrepGestureMove(e, {
      gestureRef,
      setViewport,
    });
  }

  function handleMouseDown(e) {
    handlePrepMouseDown(e, {
      tool,
      setLastInputWasTouch,
      activeStylusRef,
      palmRejectionTimeoutRef,
      getNormalizedPoint,
      handleSelectionPointerDown: handlePrepSelectionPointerDown,
      selectionCtx: {
        findItemAtPoint,
        selectedItems,
        setSelectedItems,
        setSelectionBox,
        setGroupDrag,
        collections: {
          strokes,
          stickyNotes,
          textBoxes,
          masks,
          lines,
          boxes,
        },
      },
      isPdf,
      pdfCurrentPage,
      isTeacher,
      myUserId,
      setTeacherPointerByPage,
      setLearnerPointersByPage,
      broadcastPointer,
      setMaskDrag,
      setShapeDrag,
      activeTextId,
      setActiveTextId,
      createTextBox,
      startDrawing,
      handleClickForNote,
    });
  }

  function handleMouseMove(e) {
    handlePrepMouseMove(e, {
      activeStylusRef,
      resizeState,
      widthResizeState,
      handleFontSizeResize,
      handleWidthResize,
      groupDrag,
      getNormalizedPoint,
      handleGroupDragMove: handlePrepGroupDragMove,
      groupDragCtx: {
        groupDrag,
        strokes,
        stickyNotes,
        textBoxes,
        masks,
        lines,
        boxes,
        setStrokes,
        setStickyNotes,
        setTextBoxes,
        setMasks,
        setLines,
        setBoxes,
      },
      selectionBox,
      handleSelectionBoxMove: handlePrepSelectionBoxMove,
      setSelectionBox,
      maskDrag,
      setMaskDrag,
      setMasks,
      scheduleSaveAnnotations,
      scheduleBroadcastAnnotations,
      shapeDrag,
      setShapeDrag,
      dragState,
      draw,
      tool,
    });
  }

  function handleMouseUp(e) {
    handlePrepMouseUp(e, {
      groupDrag,
      finalizeGroupDrag: finalizePrepGroupDrag,
      finalizeGroupDragCtx: {
        groupDrag,
        setGroupDrag,
        strokes,
        stickyNotes,
        textBoxes,
        masks,
        lines,
        boxes,
        scheduleSaveAnnotations,
        scheduleBroadcastAnnotations,
      },
      selectionBox,
      finalizeSelectionBox: finalizePrepSelectionBox,
      finalizeSelectionBoxCtx: {
        selectionBox,
        isPdf,
        pdfCurrentPage,
        strokes,
        stickyNotes,
        textBoxes,
        masks,
        lines,
        boxes,
        containerWidth,
        setSelectedItems,
        setSelectionBox,
      },
      resizeState,
      stopFontSizeResize,
      widthResizeState,
      stopWidthResize,
      maskDrag,
      getNormalizedPoint,
      finalizeCreatingMask,
      setMaskDrag,
      saveAnnotations,
      broadcastAnnotations,
      shapeDrag,
      finalizeCreatingShape,
      stopDrawing,
    });
  }

  // ✅ Make resize/drag track the cursor even if it leaves the overlay
  useEffect(() => {
    const shouldCapture =
      !!resizeState ||
      !!widthResizeState ||
      !!dragState ||
      !!maskDrag ||
      !!shapeDrag ||
      !!isDrawing;

    if (!shouldCapture) return;

    const onMove = (e) => handleMouseMove(e);
    const onUp = (e) => handleMouseUp(e);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resizeState,
    widthResizeState,
    dragState,
    maskDrag,
    shapeDrag,
    isDrawing,
  ]);

  // ─────────────────────────────────────────────────────────────
  // Tool switching helper (toggling)
  // ─────────────────────────────────────────────────────────────
  function setToolSafe(nextTool) {
    setPrepToolSafe(nextTool, {
      tool,
      setTool,
      isPdf,
      pdfCurrentPage,
      isTeacher,
      myUserId,
      setTeacherPointerByPage,
      setLearnerPointersByPage,
      broadcastPointer,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Render overlay
  // ─────────────────────────────────────────────────────────────
  function renderAnnotationsOverlay() {
    return (
      <PrepAnnotationsOverlay
        ctx={{
          toolMenuOpen,
          colorMenuOpen,
          isPdf,
          pdfCurrentPage,
          teacherPointerByPage,
          learnerPointersByPage,
          tool,
          stickyNotes,
          textBoxes,
          masks,
          maskDrag,
          showGrid,
          measureSpanRef,
          canvasRef,
          handleMouseMove,
          handleMouseUp,
          handleGestureMove,
          gestureRef,
          handleTouchStartGesture,
          handleMouseDown,
          strokes,
          lines,
          boxes,
          penColor,
          selectionBox,
          selectedItems,
          activeTextId,
          resizeState,
          widthResizeState,
          annotationScale,
          deleteTextBox,
          startTextDrag,
          blurDebounceRef,
          startWidthResize,
          textAreaRefs,
          updateTextBoxText,
          handleTextBoxBlur,
          autoResizeTextarea,
          startFontSizeResize,
          setActiveTextId,
          textPlaceholder: t(dict, "resources_prep_text_placeholder"),
          startNoteDrag,
          deleteNote,
          updateNoteText,
          notePlaceholder: t(dict, "resources_prep_note_placeholder"),
          startMaskMove,
          shapeDrag,
        }}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Viewer activity flag
  // ─────────────────────────────────────────────────────────────
  const viewerIsActive = hasScreenShare || !!viewerUrl;

  // ─────────────────────────────────────────────────────────────
  // Audio tracks (single + multiple)
  // ─────────────────────────────────────────────────────────────
  const audioTracks = buildPrepAudioTracks(resource);

  const hasAudio = audioTracks.length > 0;
  const safeTrackIndex = hasAudio
    ? Math.min(currentTrackIndex, Math.max(audioTracks.length - 1, 0))
    : 0;
  const currentTrack = hasAudio ? audioTracks[safeTrackIndex] : null;

  // ─────────────────────────────────────────────────────────────
  // Current tool meta
  // ─────────────────────────────────────────────────────────────
  const currentToolIcon = getPrepCurrentToolIcon(tool);
  const currentToolLabel = getPrepCurrentToolLabel(tool, {
    pen: t(dict, "resources_toolbar_pen"),
    highlighter: t(dict, "resources_toolbar_highlighter"),
    text: t(dict, "resources_toolbar_text"),
    eraser: t(dict, "resources_toolbar_eraser"),
    note: t(dict, "resources_toolbar_note"),
    pointer: t(dict, "resources_toolbar_pointer"),
  });

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <PrepBreadcrumbs
        show={showBreadcrumbs}
        prefix={prefix}
        track={track}
        level={level}
        subLevel={subLevel}
        unit={unit}
        rootLabel={t(dict, "resources_breadcrumb_root")}
        prepRoomLabel={t(dict, "resources_breadcrumb_prep_room")}
      />

      <div className={layoutClasses}>
        <PrepInfoSidebar
          show={showSidebar}
          resource={resource}
          prefix={prefix}
          unit={unit}
          locale={locale}
          viewerRawUrl={viewer?.rawUrl}
          backToPickerLabel={t(dict, "resources_prep_info_back_to_picker")}
          viewUnitLabel={t(dict, "resources_prep_info_view_unit")}
          openRawLabel={t(dict, "resources_prep_info_open_raw")}
        />

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
              <PrepToolbar
                hideSidebar={hideSidebar}
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                sidebarShowLabel={t(dict, "resources_toolbar_sidebar_show")}
                sidebarHideLabel={t(dict, "resources_toolbar_sidebar_hide")}
                classroomChannel={classroomChannel}
                channelReady={channelReady}
                undo={undo}
                redo={redo}
                historyLength={historyStack.length}
                redoLength={redoStack.length}
                hasAudio={hasAudio}
                audioTracks={audioTracks}
                safeTrackIndex={safeTrackIndex}
                setCurrentTrackIndex={setCurrentTrackIndex}
                setIsAudioPlaying={setIsAudioPlaying}
                audioRef={audioRef}
                isTeacher={isTeacher}
                sendOnChannel={sendOnChannel}
                sendAudioState={sendAudioState}
                isAudioPlaying={isAudioPlaying}
                needsAudioUnlock={needsAudioUnlock}
                setNeedsAudioUnlock={setNeedsAudioUnlock}
                currentTrackUrl={currentTrack ? currentTrack.url : null}
                tool={tool}
                drawMenuRef={drawMenuRef}
                moreMenuRef={moreMenuRef}
                drawMenuOpen={drawMenuOpen}
                setDrawMenuOpen={setDrawMenuOpen}
                moreMenuOpen={moreMenuOpen}
                setMoreMenuOpen={setMoreMenuOpen}
                setShowWidthPicker={setShowWidthPicker}
                setColorMenuOpen={setColorMenuOpen}
                setToolSafe={setToolSafe}
                showGrid={showGrid}
                setShowGrid={setShowGrid}
                handleExport={handleExport}
                viewport={viewport}
                setViewport={setViewport}
                requestClearAll={requestClearAll}
                widthPickerRef={widthPickerRef}
                setToolMenuOpen={setToolMenuOpen}
                widthLabel={t(dict, "resources_toolbar_width")}
                penStrokeWidth={penStrokeWidth}
                showWidthPicker={showWidthPicker}
                STROKE_WIDTH_OPTIONS={STROKE_WIDTH_OPTIONS}
                setPenStrokeWidth={setPenStrokeWidth}
                colorMenuRef={colorMenuRef}
                penColor={penColor}
                colorMenuOpen={colorMenuOpen}
                PEN_COLORS={PEN_COLORS}
                setPenColor={setPenColor}
              />

              <div className="prep-viewer__frame-wrapper">
                <PrepViewerFrame
                  hasScreenShare={hasScreenShare}
                  containerRef={containerRef}
                  viewport={viewport}
                  screenVideoRef={screenVideoRef}
                  renderAnnotationsOverlay={renderAnnotationsOverlay}
                  isPdf={isPdf}
                  pdfViewerUrl={pdfViewerUrl}
                  pdfScrollRef={pdfScrollRef}
                  handlePdfNavStateChange={handlePdfNavStateChange}
                  broadcastPdfFitToPage={broadcastPdfFitToPage}
                  locale={locale}
                  viewerUrl={viewerUrl}
                  resourceTitle={resource.title}
                  viewer={viewer}
                />
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

      <PrepClearConfirmModal
        show={showClearConfirm}
        isPdf={isPdf}
        pdfCurrentPage={pdfCurrentPage}
        onCancel={cancelClearAll}
        onConfirm={confirmClearAll}
        title={t(dict, "resources_clear_confirm_title")}
        messagePage={t(dict, "resources_clear_confirm_message_page")}
        message={t(dict, "resources_clear_confirm_message")}
        cancelLabel={t(dict, "resources_clear_confirm_cancel")}
        confirmLabel={t(dict, "resources_clear_confirm_yes")}
      />
    </>
  );
}
