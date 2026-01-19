// app/resources/prep/PrepShell.jsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import PrepNotes from "./PrepNotes";
import PdfViewerWithSidebar from "./PdfViewerWithSidebar";
import { getDictionary, t } from "@/app/i18n";
import useAuth from "@/hooks/useAuth";

const TOOL_NONE = "none";
const TOOL_PEN = "pen";
const TOOL_HIGHLIGHTER = "highlighter";
const TOOL_NOTE = "note";
const TOOL_POINTER = "pointer";
const TOOL_ERASER = "eraser";
const TOOL_TEXT = "text";
const TOOL_MASK = "mask"; // white block to hide parts of the page
const TOOL_LINE = "line"; // straight line connector
const TOOL_BOX = "box"; // border rectangle around areas

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const HIT_RADIUS_STROKE = 0.015; // hit radius for pen/highlighter strokes
const HIT_RADIUS_LINE = 0.006; // hit radius for straight lines
const HIT_RADIUS_BOX_BORDER = 0.008; // hit radius for box borders

// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS (Fix #15: clamp at top level)
// ─────────────────────────────────────────────────────────────
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Fix #12: Touch event converter for touch support
function getTouchPoint(touchEvent) {
  if (!touchEvent.touches || touchEvent.touches.length === 0) return null;
  const touch = touchEvent.touches[0];
  return {
    clientX: touch.clientX,
    clientY: touch.clientY,
    target: touchEvent.target,
  };
}

// Get z-index from element ID (IDs contain timestamp like "text_1234567890_xyz")
// Newer elements get higher z-index so they appear on top
// Z-index range: 1-49 (toolbar uses 50, menus use higher values)
function getZIndexFromId(id) {
  if (!id) return 10;
  const match = id.match(/_(\d+)_/);
  if (!match) return 10;
  // Extract timestamp and use modulo to keep z-index reasonable
  // But use a larger range (1000) and then clamp to 10-49
  const timestamp = parseInt(match[1], 10);
  const orderValue = timestamp % 10000;
  // Scale to 10-49 range
  return 10 + Math.floor((orderValue / 10000) * 39);
}

// Get timestamp from ID for sorting (larger = newer = should be on top)
function getTimestampFromId(id) {
  if (!id) return 0;
  const match = id.match(/_(\d+)_/);
  if (!match) return 0;
  return parseInt(match[1], 10);
}

// Detect if text starts with RTL characters (Arabic, Hebrew, Farsi, etc.)
// Used to determine text expansion direction in text boxes
function isTextRTL(text) {
  if (!text || text.length === 0) return false;
  // Find first non-whitespace character
  const trimmed = text.trimStart();
  if (!trimmed) return false;
  // RTL Unicode ranges: Arabic, Hebrew, Syriac, Thaana, etc.
  const rtlPattern = /^[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB00-\uFDFF\uFE70-\uFEFF\u0700-\u074F]/;
  return rtlPattern.test(trimmed);
}

const PEN_COLORS = [
  "#000000",
  "#f9fafb",
  "#fbbf24",
  "#60a5fa",
  "#f97316",
  "#22c55e",
  "#ef4444", // vibrant red
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#64748b", // slate gray
  "#f59e0b", // amber
];

const POINTER_COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#f97316", // orange
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#eab308", // yellow
];

function colorForId(id) {
  const s = String(id || "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return POINTER_COLORS[hash % POINTER_COLORS.length];
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

  const hasScreenShare = !!isScreenShareActive;

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

  // Utility: distance from point to line segment
  function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const len2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (len2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / len2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  // Utility: distance from point to rect border (check all four edges)
  function pointToRectBorderDistance(px, py, rx, ry, rw, rh) {
    const right = rx + rw;
    const bottom = ry + rh;

    // Calculate distance to each of the four edges (line segments)
    const distTop = pointToLineDistance(px, py, rx, ry, right, ry);
    const distBottom = pointToLineDistance(px, py, rx, bottom, right, bottom);
    const distLeft = pointToLineDistance(px, py, rx, ry, rx, bottom);
    const distRight = pointToLineDistance(px, py, right, ry, right, bottom);

    // Return minimum distance to any edge
    return Math.min(distTop, distBottom, distLeft, distRight);
  }

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
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []); // Refs are stable, no need to include in deps

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
        ctx.lineWidth = 12;
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
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
      ctx.restore();
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

      // ✅ Track container width for proportional annotation scaling
      setContainerWidth(rect.width);

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
  }, [hasScreenShare, strokes, isPdf, pdfCurrentPage]);

  // ─────────────────────────────────────────────────────────────
  // Persistence + broadcasting
  // ─────────────────────────────────────────────────────────────
  const saveDebounceRef = useRef(null);
  const pendingSaveRef = useRef({});

  function saveAnnotations(opts = {}, saveOpts = { includeCanvas: false }) {
    if (!storageKey) return;

    try {
      let canvasData;
      if (saveOpts?.includeCanvas) {
        const canvas = canvasRef.current;
        canvasData =
          opts.canvasData ??
          (canvas ? canvas.toDataURL("image/png") : undefined);
      }

      const data = {
        canvasData: (saveOpts?.includeCanvas ? canvasData : undefined) || null,
        strokes: opts.strokes ?? strokesRef.current,
        stickyNotes: opts.stickyNotes ?? stickyNotesRef.current,
        textBoxes: opts.textBoxes ?? textBoxesRef.current,
        masks: opts.masks ?? masksRef.current,
        lines: opts.lines ?? linesRef.current,
        boxes: opts.boxes ?? boxesRef.current,
      };

      window.localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn("Failed to save annotations", err);
    }
  }

  const pendingBroadcastRef = useRef({});
  const broadcastRafRef = useRef(false);

  function scheduleBroadcastAnnotations(partial = {}) {
    Object.assign(pendingBroadcastRef.current, partial);
    if (broadcastRafRef.current) return;

    broadcastRafRef.current = true;
    requestAnimationFrame(() => {
      broadcastRafRef.current = false;
      broadcastAnnotations(pendingBroadcastRef.current, {
        includeCanvas: false,
      });
      pendingBroadcastRef.current = {};
    });
  }

  function scheduleSaveAnnotations(partial = {}) {
    pendingSaveRef.current = { ...pendingSaveRef.current, ...partial };

    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      const payload = pendingSaveRef.current;
      pendingSaveRef.current = {};
      saveAnnotations(payload, { includeCanvas: false });
    }, 300);
  }

  function broadcastAnnotations(custom = {}, opts = { includeCanvas: false }) {
    if (!channelReady || !sendOnChannel) return;
    if (applyingRemoteRef.current) return;

    let canvasData = null;
    if (opts?.includeCanvas) {
      const canvas = canvasRef.current;
      canvasData =
        custom.canvasData ?? (canvas ? canvas.toDataURL("image/png") : null);
    }

    const payload = {
      type: "ANNOTATION_STATE",
      resourceId: resource._id,
      canvasData: canvasData || null,
      strokes: custom.strokes ?? strokesRef.current,
      stickyNotes: custom.stickyNotes ?? stickyNotesRef.current,
      textBoxes: custom.textBoxes ?? textBoxesRef.current,
      masks: custom.masks ?? masksRef.current,
      lines: custom.lines ?? linesRef.current,
      boxes: custom.boxes ?? boxesRef.current,
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

    const page = isPdf ? pdfCurrentPage : 1;

    // Teacher broadcasts a shared pointer
    if (isTeacher) {
      if (!normalizedPosOrNull) {
        sendOnChannel({
          type: "TEACHER_POINTER_HIDE",
          resourceId: resource._id,
          page,
        });
        return;
      }
      sendOnChannel({
        type: "TEACHER_POINTER_MOVE",
        resourceId: resource._id,
        page,
        xNorm: normalizedPosOrNull.x,
        yNorm: normalizedPosOrNull.y,
      });
      return;
    }

    // Learner broadcasts THEIR OWN pointer (keyed by userId)
    if (!myUserId) return;

    if (!normalizedPosOrNull) {
      sendOnChannel({
        type: "LEARNER_POINTER_HIDE",
        resourceId: resource._id,
        page,
        userId: myUserId,
      });
      return;
    }

    sendOnChannel({
      type: "LEARNER_POINTER_MOVE",
      resourceId: resource._id,
      page,
      userId: myUserId,
      xNorm: normalizedPosOrNull.x,
      yNorm: normalizedPosOrNull.y,
    });
  }

  function broadcastPdfFitToPage() {
    if (!channelReady || !sendOnChannel) return;
    if (!isTeacher) return;
    if (!isPdf) return;
    if (applyingRemoteRef.current) return;

    sendOnChannel({
      type: "PDF_FIT_TO_PAGE",
      resourceId: resource._id,
      page: pdfCurrentPage, // optional, but useful for consistency
      at: Date.now(),
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
      lines: remoteLines,
      boxes: remoteBoxes,
    } = message;
    applyingRemoteRef.current = true;
    try {
      if (Array.isArray(remoteNotes)) setStickyNotes(remoteNotes);
      if (Array.isArray(remoteText)) setTextBoxes(remoteText);
      if (Array.isArray(remoteMasks)) setMasks(remoteMasks);
      if (Array.isArray(remoteLines)) setLines(remoteLines);
      if (Array.isArray(remoteBoxes)) setBoxes(remoteBoxes);
      if (Array.isArray(remoteStrokes)) {
        setStrokes(remoteStrokes);
      } else if (canvasData && canvasRef.current) {
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
      scheduleSaveAnnotations({
        canvasData: canvasData || null,
        strokes: Array.isArray(remoteStrokes)
          ? remoteStrokes
          : strokesRef.current,
        stickyNotes: Array.isArray(remoteNotes)
          ? remoteNotes
          : stickyNotesRef.current,
        textBoxes: Array.isArray(remoteText)
          ? remoteText
          : textBoxesRef.current,
        masks: Array.isArray(remoteMasks) ? remoteMasks : masksRef.current,
        lines: Array.isArray(remoteLines) ? remoteLines : linesRef.current,
        boxes: Array.isArray(remoteBoxes) ? remoteBoxes : boxesRef.current,
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
        return;
      }
      // Teacher shared pointer (everyone should follow this)
      if (msg.type === "TEACHER_POINTER_MOVE") {
        const page = Number(msg.page) || 1;
        setTeacherPointerByPage((prev) => ({
          ...prev,
          [page]: { x: msg.xNorm, y: msg.yNorm },
        }));
        return;
      }
      if (msg.type === "TEACHER_POINTER_HIDE") {
        const page = Number(msg.page) || 1;
        setTeacherPointerByPage((prev) => {
          const next = { ...prev };
          delete next[page];
          return next;
        });
        return;
      }

      if (msg.type === "LEARNER_POINTER_MOVE") {
        const uid = msg.userId || msg.senderId;
        if (!uid) return;

        const page = Number(msg.page) || 1;

        setLearnerPointersByPage((prev) => ({
          ...prev,
          [page]: {
            ...(prev[page] || {}),
            [uid]: { x: msg.xNorm, y: msg.yNorm },
          },
        }));
        return;
      }

      if (msg.type === "LEARNER_POINTER_HIDE") {
        const uid = msg.userId || msg.senderId;
        if (!uid) return;

        const page = Number(msg.page) || 1;

        setLearnerPointersByPage((prev) => {
          const next = { ...prev };
          if (!next[page]) return next;
          const perPage = { ...next[page] };
          delete perPage[uid];
          if (Object.keys(perPage).length === 0) {
            delete next[page];
          } else {
            next[page] = perPage;
          }
          return next;
        });
        return;
      }

      // ✅ Learner: follow teacher PDF page
      if (msg.type === "PDF_SET_PAGE" && !isTeacher && isPdf) {
        const page = Number(msg.page) || 1;
        const api = pdfNavApiRef.current;
        if (api?.setPage) api.setPage(page);
        return;
      }

      // ✅ Learner: follow teacher PDF scroll
      if (msg.type === "PDF_SCROLL" && !isTeacher && isPdf) {
        const api = pdfNavApiRef.current;
        const targetPage = Number(msg.page) || 1;

        // switch page first if needed
        if (api?.setPage && targetPage !== pdfCurrentPage) {
          api.setPage(targetPage);
        }

        // apply scroll after render tick
        setTimeout(() => {
          const el = pdfScrollRef.current;
          if (!el) return;

          const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
          const norm = Math.min(1, Math.max(0, Number(msg.scrollNorm) || 0));
          el.scrollTop = norm * maxScroll;
        }, 0);

        return;
      }

      // ✅ Learner: teacher pressed "fit to page"
      if (msg.type === "PDF_FIT_TO_PAGE" && !isTeacher && isPdf) {
        const api = pdfNavApiRef.current;

        // If message included a page, align page first (optional but nice)
        const targetPage = Number(msg.page) || pdfCurrentPage;
        if (api?.setPage && targetPage !== pdfCurrentPage) {
          api.setPage(targetPage);
        }

        // Run after render tick so container sizes are correct
        setTimeout(() => {
          const a = pdfNavApiRef.current;
          if (a?.fitToPage) a.fitToPage();
        }, 0);

        return;
      }

      // ✅ Handle unified AUDIO_STATE messages from teacher
      if (msg.type === "AUDIO_STATE" && !isTeacher) {
        applyAudioState(msg);
        return;
      }

      if (isTeacher) return;

      const el = audioRef.current;
      if (!el) return;

      const safeSetTime = (time) => {
        if (typeof time !== "number") return;
        try {
          el.currentTime = Math.max(0, time);
        } catch (_) { }
      };

      const runAfterLoad = (fn) => {
        const ready = el.readyState >= 1;
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
  }, [classroomChannel, resource._id, isTeacher, isPdf, pdfCurrentPage, applyAudioState]);

  // ─────────────────────────────────────────────────────────────
  // Drawing tools (pen / highlighter / eraser) using normalized coords
  // ─────────────────────────────────────────────────────────────
  function eraseAtPoint(e) {
    const p = getNormalizedPoint(e);
    if (!p) return;

    const page = isPdf ? pdfCurrentPage : 1;

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY-BASED ERASING
    // 1. First check "thin" elements (strokes, lines, box borders) - these need
    //    a hit radius because they're hard to click precisely
    // 2. Only if no thin element is hit, check "large area" elements (text,
    //    notes, masks) - these are easy to target so require exact clicks
    // ═══════════════════════════════════════════════════════════════════════

    // ─── PASS 1: Check thin elements (with hit radius) ────────────────────
    let thinHit = { kind: null, id: null, dist: Infinity };

    // 1) Strokes (pen/highlighter): treat closest point distance as metric
    for (const s of strokes) {
      if (isPdf && (s.page ?? 1) !== page) continue;
      if (s.tool !== TOOL_PEN && s.tool !== TOOL_HIGHLIGHTER) continue;
      if (!Array.isArray(s.points) || s.points.length === 0) continue;

      let minD2 = Infinity;
      for (const pt of s.points) {
        const dx = pt.x - p.x;
        const dy = pt.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < minD2) minD2 = d2;
      }

      const hit = minD2 <= HIT_RADIUS_STROKE * HIT_RADIUS_STROKE;
      if (hit) {
        const d = Math.sqrt(minD2);
        if (d < thinHit.dist) thinHit = { kind: "stroke", id: s.id, dist: d };
      }
    }

    // 2) Lines: segment distance
    for (const l of lines) {
      if (isPdf && (l.page ?? 1) !== page) continue;
      const d = pointToLineDistance(p.x, p.y, l.x1, l.y1, l.x2, l.y2);
      if (d <= HIT_RADIUS_LINE && d < thinHit.dist) {
        thinHit = { kind: "line", id: l.id, dist: d };
      }
    }

    // 3) Boxes: border distance (not fill, just the border)
    for (const b of boxes) {
      if (isPdf && (b.page ?? 1) !== page) continue;
      const d = pointToRectBorderDistance(
        p.x,
        p.y,
        b.x,
        b.y,
        b.width,
        b.height
      );
      if (d <= HIT_RADIUS_BOX_BORDER && d < thinHit.dist) {
        thinHit = { kind: "box", id: b.id, dist: d };
      }
    }

    // If we hit a thin element, delete it and return (priority over large areas)
    if (thinHit.kind && thinHit.id) {
      if (thinHit.kind === "stroke") {
        setStrokes((prev) => {
          const next = prev.filter((s) => s.id !== thinHit.id);
          scheduleSaveAnnotations({ strokes: next });
          scheduleBroadcastAnnotations({ strokes: next });
          return next;
        });
        return;
      }
      if (thinHit.kind === "line") {
        setLines((prev) => {
          const next = prev.filter((l) => l.id !== thinHit.id);
          scheduleSaveAnnotations({ lines: next });
          scheduleBroadcastAnnotations({ lines: next });
          return next;
        });
        return;
      }
      if (thinHit.kind === "box") {
        setBoxes((prev) => {
          const next = prev.filter((b) => b.id !== thinHit.id);
          scheduleSaveAnnotations({ boxes: next });
          scheduleBroadcastAnnotations({ boxes: next });
          return next;
        });
        return;
      }
    }

    // ─── PASS 2: Check large area elements (exact click required) ─────────
    // Only reached if no thin element was hit
    let areaHit = { kind: null, id: null };

    // 4) Text boxes: check if point is inside
    for (const t of textBoxes) {
      if (isPdf && (t.page ?? 1) !== page) continue;
      const container = containerRef.current;
      const rect = container?.getBoundingClientRect();
      const normWidth = t.width / (rect?.width || 1000);
      const halfW = normWidth / 2;
      const halfH = 0.03; // approximate height in normalized coords
      const inside =
        p.x >= t.x - halfW &&
        p.x <= t.x + halfW &&
        p.y >= t.y - halfH &&
        p.y <= t.y + halfH;

      if (inside) {
        areaHit = { kind: "text", id: t.id };
        break; // First hit wins for area elements
      }
    }

    // 5) Sticky notes: check if point is inside
    if (!areaHit.kind) {
      for (const n of stickyNotes) {
        if (isPdf && (n.page ?? 1) !== page) continue;
        const noteW = 0.15;
        const noteH = 0.12;
        const inside =
          p.x >= n.x && p.x <= n.x + noteW && p.y >= n.y && p.y <= n.y + noteH;

        if (inside) {
          areaHit = { kind: "note", id: n.id };
          break;
        }
      }
    }

    // 6) Masks: check if point is inside
    if (!areaHit.kind) {
      for (const m of masks) {
        if (isPdf && (m.page ?? 1) !== page) continue;
        const inside =
          p.x >= m.x &&
          p.x <= m.x + m.width &&
          p.y >= m.y &&
          p.y <= m.y + m.height;

        if (inside) {
          areaHit = { kind: "mask", id: m.id };
          break;
        }
      }
    }

    // Nothing hit → do nothing
    if (!areaHit.kind || !areaHit.id) return;

    // Delete the area element
    if (areaHit.kind === "text") {
      setTextBoxes((prev) => {
        const next = prev.filter((t) => t.id !== areaHit.id);
        scheduleSaveAnnotations({ textBoxes: next });
        scheduleBroadcastAnnotations({ textBoxes: next });
        return next;
      });
      if (activeTextId === areaHit.id) setActiveTextId(null);
      if (textAreaRefs.current?.[areaHit.id]) delete textAreaRefs.current[areaHit.id];
      return;
    }

    if (areaHit.kind === "note") {
      setStickyNotes((prev) => {
        const next = prev.filter((n) => n.id !== areaHit.id);
        scheduleSaveAnnotations({ stickyNotes: next });
        scheduleBroadcastAnnotations({ stickyNotes: next });
        return next;
      });
      return;
    }

    if (areaHit.kind === "mask") {
      setMasks((prev) => {
        const next = prev.filter((m) => m.id !== areaHit.id);
        scheduleSaveAnnotations({ masks: next });
        scheduleBroadcastAnnotations({ masks: next });
        return next;
      });
      return;
    }
  }

  function startDrawing(e) {
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
          scheduleSaveAnnotations({ stickyNotes: updated });
          scheduleBroadcastAnnotations({ stickyNotes: updated });

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
          // ✅ keep state synced during drag (throttled + debounced)
          scheduleSaveAnnotations({ textBoxes: updated });
          scheduleBroadcastAnnotations({ textBoxes: updated });
          return updated;
        });
      }
      return;
    }

    if (!isDrawing) return;

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

        if (stroke.tool === TOOL_HIGHLIGHTER && stroke.points.length > 0) {
          const firstY = stroke.points[0].y;
          return {
            ...stroke,
            points: [...stroke.points, { x: p.x, y: firstY }],
          };
        }

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

    if (dragState) setDragState(null);
    if (maskDrag) setMaskDrag(null);

    // Fix #9: Use scheduleSave/Broadcast which read from current state
    // This avoids stale closure issues with the immediate save/broadcast
    scheduleSaveAnnotations({});
    scheduleBroadcastAnnotations({});
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
    scheduleSaveAnnotations({ stickyNotes: nextNotes });
    scheduleBroadcastAnnotations({ stickyNotes: nextNotes });
  }

  function updateNoteText(id, text) {
    const next = stickyNotes.map((n) => (n.id === id ? { ...n, text } : n));
    setStickyNotes(next);
    scheduleSaveAnnotations({ stickyNotes: next });
    scheduleBroadcastAnnotations({ stickyNotes: next });
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
      fontSize: 13, // ✅ 20% smaller than previous 16px
      width: 120, // Adjusted for smaller font
      minWidth: 60,
      autoWidth: true, // ✅ start in “single-line, no wrap” mode
      dir: "ltr", // ✅ Default to LTR, auto-detects on first character typed
      page: isPdf ? pdfCurrentPage : 1,
    };

    const next = [...textBoxes, box];
    setTextBoxes(next);
    setActiveTextId(box.id);
    scheduleSaveAnnotations({ textBoxes: next });
    scheduleBroadcastAnnotations({ textBoxes: next });

    // ensure height after mount
    setTimeout(() => autoResizeTextarea(box.id), 0);
  }

  function updateTextBoxText(id, text) {
    setTextBoxes((prev) => {
      const updated = prev.map((tbox) => {
        if (tbox.id !== id) return tbox;

        // ✅ Auto-detect text direction on first character typed
        let detectedDir = tbox.dir || "ltr";
        if (text && text.length > 0 && (!tbox.text || tbox.text.length === 0)) {
          // First character being typed - detect direction
          detectedDir = isTextRTL(text) ? "rtl" : "ltr";
        }

        // ✅ auto-fit width while typing (unless user manually resized width)
        const withText = { ...tbox, text, dir: detectedDir };
        const fitted = autoFitTextBoxWidthIfNeeded(withText, text);
        return fitted;
      });
      scheduleSaveAnnotations({ textBoxes: updated });
      scheduleBroadcastAnnotations({ textBoxes: updated });

      return updated;
    });

    // ✅ resize textarea height immediately while typing
    setTimeout(() => autoResizeTextarea(id), 0);
  }

  function deleteTextBox(id) {
    const next = textBoxes.filter((t) => t.id !== id);
    setTextBoxes(next);
    scheduleSaveAnnotations({ textBoxes: next });
    scheduleBroadcastAnnotations({ textBoxes: next });

    if (activeTextId === id) setActiveTextId(null);

    // cleanup ref
    if (textAreaRefs.current?.[id]) delete textAreaRefs.current[id];
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

  function startFontSizeResize(e, box) {
    e.stopPropagation();
    e.preventDefault();
    const container = containerRef.current || canvasRef.current;
    const rect = container?.getBoundingClientRect();
    setWidthResizeState(null); // Clear any ongoing width resize
    // Disable autoWidth since this is manual resize
    setTextBoxes((prev) =>
      prev.map((t) => (t.id === box.id ? { ...t, autoWidth: false } : t))
    );
    setResizeState({
      id: box.id,
      startX: e.clientX,
      startY: e.clientY,
      startFontSize: box.fontSize || 16,
      startWidth: box.width || 150,
      startBoxX: box.x,
      containerWidth: rect?.width || 1000,
    });
  }

  function handleFontSizeResize(e) {
    if (!resizeState) return;
    const deltaX = e.clientX - resizeState.startX;
    const deltaY = e.clientY - resizeState.startY;
    const newFontSize = Math.max(
      10,
      Math.min(120, resizeState.startFontSize + deltaY * 0.2) // Adjusted scale for better control
    );
    let newWidth = Math.max(120, resizeState.startWidth + deltaX);
    const maxW = resizeState.containerWidth * 0.95;
    newWidth = Math.min(newWidth, maxW);
    const widthChange = newWidth - resizeState.startWidth;
    const shiftNorm = widthChange / 2 / resizeState.containerWidth;
    const nextX = resizeState.startBoxX + shiftNorm;
    setTextBoxes((prev) => {
      const updated = prev.map((tbox) => {
        if (tbox.id !== resizeState.id) return tbox;
        const withChanges = {
          ...tbox,
          x: nextX,
          fontSize: Math.round(newFontSize),
          width: Math.round(newWidth),
          autoWidth: false,
        };
        // Check if can switch back to autoWidth (single line fit)
        const measured = measureTextWidthPx(withChanges.text, {
          fontSize: withChanges.fontSize,
        });
        const desired = measured + 40;
        if (withChanges.width >= desired) {
          return autoFitTextBoxWidthIfNeeded(
            { ...withChanges, autoWidth: true, width: desired },
            withChanges.text
          );
        }
        return withChanges;
      });
      // Save and broadcast during drag for real-time sync (throttled + debounced)
      scheduleSaveAnnotations({ textBoxes: updated });
      scheduleBroadcastAnnotations({ textBoxes: updated });
      return updated;
    });
    // keep textarea height accurate while resizing font
    setTimeout(() => autoResizeTextarea(resizeState.id), 0);
  }

  function stopFontSizeResize() {
    if (!resizeState) return;
    setResizeState(null);

    // flush snapshot once at the end (optional canvas snapshot)
    saveAnnotations({}, { includeCanvas: true });
    broadcastAnnotations({}, { includeCanvas: true });
  }

  function startWidthResize(e, box, direction) {
    e.stopPropagation();
    e.preventDefault();
    const container = containerRef.current || canvasRef.current;
    const rect = container?.getBoundingClientRect();
    setWidthResizeState({
      id: box.id,
      startX: e.clientX,
      startWidth: box.width || 150,
      startBoxX: box.x,
      direction,
      containerWidth: rect?.width || 1000,
    });
    // ✅ when user starts manual resizing, disable autoWidth for that box
    setTextBoxes((prev) =>
      prev.map((tbox) =>
        tbox.id === box.id ? { ...tbox, autoWidth: false } : tbox
      )
    );
  }

  function handleWidthResize(e) {
    if (!widthResizeState) return;
    const deltaX = e.clientX - widthResizeState.startX;
    setTextBoxes((prev) => {
      const updated = prev.map((tbox) => {
        if (tbox.id !== widthResizeState.id) return tbox;
        const minW = tbox.minWidth || 80;
        let newWidth;
        let nextX = tbox.x;
        let widthChange;
        if (widthResizeState.direction === "right") {
          newWidth = Math.max(minW, widthResizeState.startWidth + deltaX);
          widthChange = newWidth - widthResizeState.startWidth;
          const shiftNorm = widthChange / 2 / widthResizeState.containerWidth;
          nextX = widthResizeState.startBoxX + shiftNorm; // Shift right to keep left fixed
        } else {
          newWidth = Math.max(minW, widthResizeState.startWidth - deltaX);
          widthChange = newWidth - widthResizeState.startWidth;
          const shiftNorm = -widthChange / 2 / widthResizeState.containerWidth;
          nextX = widthResizeState.startBoxX + shiftNorm; // Shift left to keep right fixed
        }
        const maxW = widthResizeState.containerWidth * 0.95;
        newWidth = Math.min(newWidth, maxW);
        const withWidth = { ...tbox, x: nextX, width: Math.round(newWidth) };
        // Check if can switch back to autoWidth (single line fit)
        const measured = measureTextWidthPx(withWidth.text, {
          fontSize: withWidth.fontSize || 16,
        });
        const desired = measured + 40;
        if (newWidth >= desired) {
          return autoFitTextBoxWidthIfNeeded(
            { ...withWidth, autoWidth: true, width: desired },
            withWidth.text
          );
        } else {
          return { ...withWidth, autoWidth: false };
        }
      });
      // ✅ keep state synced during drag (throttled + debounced)
      scheduleSaveAnnotations({ textBoxes: updated });
      scheduleBroadcastAnnotations({ textBoxes: updated });
      return updated;
    });
    setTimeout(() => autoResizeTextarea(widthResizeState.id), 0);
  }
  function stopWidthResize() {
    if (!widthResizeState) return;
    setWidthResizeState(null);

    // flush snapshot once at the end (optional canvas snapshot)
    saveAnnotations({}, { includeCanvas: true });
    broadcastAnnotations({}, { includeCanvas: true });
  }

  // ─────────────────────────────────────────────────────────────
  // Mask blocks
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
      scheduleSaveAnnotations({ masks: next });
      scheduleBroadcastAnnotations({ masks: next });

      return next;
    });
  }

  function finalizeCreatingMask(endPoint) {
    if (!maskDrag || maskDrag.mode !== "creating") return;

    const startX = maskDrag.startX;
    const startY = maskDrag.startY;
    const endX = endPoint?.x ?? maskDrag.currentX;
    const endY = endPoint?.y ?? maskDrag.currentY;

    // Calculate dimensions
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    // Minimum size check - skip creating tiny accidental masks
    const MIN_SIZE = 0.01;
    if (width < MIN_SIZE || height < MIN_SIZE) {
      setMaskDrag(null);
      return;
    }

    const page = isPdf ? pdfCurrentPage : 1;
    const id = `mask_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const newMask = {
      id,
      x: left,
      y: top,
      width,
      height,
      page,
    };

    setMasks((prev) => {
      const next = [...prev, newMask];
      scheduleSaveAnnotations({ masks: next });
      scheduleBroadcastAnnotations({ masks: next });
      return next;
    });

    setMaskDrag(null);
  }

  function finalizeCreatingShape(endPoint) {
    if (!shapeDrag || shapeDrag.mode !== "creating") return;
    const startX = shapeDrag.startX;
    const startY = shapeDrag.startY;
    const endX = endPoint?.x ?? shapeDrag.currentX;
    const endY = endPoint?.y ?? shapeDrag.currentY;
    const page = isPdf ? pdfCurrentPage : 1;
    const MIN_DIST = 0.01;
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);

    // Always clear shapeDrag at the end, even if shape is too small
    // This prevents the "sticky" behavior where a preview follows the cursor
    if (dx < MIN_DIST && dy < MIN_DIST) {
      setShapeDrag(null);
      return;
    }

    const id = `shape_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    if (shapeDrag.tool === TOOL_LINE) {
      const newLine = {
        id,
        x1: startX,
        y1: startY,
        x2: endX,
        y2: endY,
        color: penColor,
        page,
      };
      setLines((prev) => {
        const next = [...prev, newLine];
        scheduleSaveAnnotations({ lines: next });
        scheduleBroadcastAnnotations({ lines: next });
        return next;
      });
    } else if (shapeDrag.tool === TOOL_BOX) {
      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      const width = dx;
      const height = dy;
      if (width < MIN_DIST || height < MIN_DIST) {
        setShapeDrag(null);
        return;
      }
      const newBox = {
        id,
        x: left,
        y: top,
        width,
        height,
        color: penColor,
        page,
      };
      setBoxes((prev) => {
        const next = [...prev, newBox];
        scheduleSaveAnnotations({ boxes: next });
        scheduleBroadcastAnnotations({ boxes: next });
        return next;
      });
    }
    setShapeDrag(null);
  }

  // ─────────────────────────────────────────────────────────────
  // Clear (ONLY CURRENT PAGE when PDF)
  // ─────────────────────────────────────────────────────────────
  function clearCanvasAndNotes() {
    const page = isPdf ? pdfCurrentPage : 1;
    // clear bitmap canvas for the current view
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // ✅ filter out only items on the current page
    const nextStrokes = strokes.filter((s) => (s.page ?? 1) !== page);
    const nextNotes = stickyNotes.filter((n) => (n.page ?? 1) !== page);
    const nextText = textBoxes.filter((b) => (b.page ?? 1) !== page);
    const nextMasks = masks.filter((m) => (m.page ?? 1) !== page);
    const nextLines = lines.filter((l) => (l.page ?? 1) !== page);
    const nextBoxes = boxes.filter((b) => (b.page ?? 1) !== page);
    setStrokes(nextStrokes);
    setStickyNotes(nextNotes);
    setTextBoxes(nextText);
    setMasks(nextMasks);
    setLines(nextLines);
    setBoxes(nextBoxes);
    setDragState(null);
    setMaskDrag(null);
    setShapeDrag(null);
    setActiveTextId(null);
    // clear pointers only for this page
    setTeacherPointerByPage((prev) => {
      const next = { ...prev };
      delete next[page];
      return next;
    });
    setLearnerPointersByPage((prev) => {
      const next = { ...prev };
      if (next[page]) delete next[page];
      return next;
    });
    // persist + broadcast the updated full state (all pages remain)
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          canvasData: null,
          strokes: nextStrokes,
          stickyNotes: nextNotes,
          textBoxes: nextText,
          masks: nextMasks,
          lines: nextLines,
          boxes: nextBoxes,
        })
      );
    } catch (err) {
      console.warn("Failed to clear annotations", err);
    }
    broadcastAnnotations({
      canvasData: null,
      strokes: nextStrokes,
      stickyNotes: nextNotes,
      textBoxes: nextText,
      masks: nextMasks,
      lines: nextLines,
      boxes: nextBoxes,
    });
    broadcastPointer(null);
  }

  // ─────────────────────────────────────────────────────────────
  // Mouse handlers
  // ─────────────────────────────────────────────────────────────
  function handleMouseDown(e) {
    const target = e.target;

    // Allow eraser to work on masks, notes, and text boxes
    // For other tools, let these elements handle their own events
    const isOnInteractiveElement = target.closest &&
      (target.closest(".prep-sticky-note") ||
        target.closest(".prep-text-box") ||
        target.closest(".prep-mask-block"));

    if (isOnInteractiveElement && tool !== TOOL_ERASER) {
      return;
    }
    if (tool === TOOL_POINTER) {
      e.preventDefault();
      const p = getNormalizedPoint(e);
      if (!p) return;
      const page = isPdf ? pdfCurrentPage : 1;
      if (isTeacher) {
        setTeacherPointerByPage((prev) => ({ ...prev, [page]: p }));
      } else if (myUserId) {
        setLearnerPointersByPage((prev) => ({
          ...prev,
          [page]: { ...(prev[page] || {}), [myUserId]: p },
        }));
      }
      broadcastPointer(p);
      return;
    }
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
    if (tool === TOOL_LINE || tool === TOOL_BOX) {
      e.preventDefault();
      const p = getNormalizedPoint(e);
      if (!p) return;
      setShapeDrag({
        mode: "creating",
        tool,
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
    if (resizeState) {
      e.preventDefault();
      handleFontSizeResize(e);
      return;
    }
    if (widthResizeState) {
      e.preventDefault();
      handleWidthResize(e);
      return;
    }
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
          scheduleSaveAnnotations({ masks: next });
          scheduleBroadcastAnnotations({ masks: next });
          return next;
        });
      }
      return;
    }
    if (shapeDrag && shapeDrag.mode === "creating") {
      e.preventDefault();
      const p = getNormalizedPoint(e);
      if (!p) return;
      setShapeDrag((prev) =>
        prev
          ? {
            ...prev,
            currentX: p.x,
            currentY: p.y,
          }
          : prev
      );
      return;
    }
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
      // Return early since finalizeCreatingMask already clears maskDrag
      // and we don't want stopDrawing to run unnecessary logic
      return;
    }
    if (maskDrag && maskDrag.mode === "moving") {
      setMaskDrag(null);
      saveAnnotations({}, { includeCanvas: true });
      broadcastAnnotations({}, { includeCanvas: true });
      return;
    }
    if (shapeDrag && shapeDrag.mode === "creating") {
      const p = e ? getNormalizedPoint(e) : null;
      const endPoint = p || { x: shapeDrag.currentX, y: shapeDrag.currentY };
      finalizeCreatingShape(endPoint);
      return;
    }
    stopDrawing();
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
    if (tool === nextTool) {
      setTool(TOOL_NONE);

      const page = isPdf ? pdfCurrentPage : 1;

      if (isTeacher) {
        setTeacherPointerByPage((prev) => {
          const next = { ...prev };
          delete next[page];
          return next;
        });
      } else {
        setLearnerPointersByPage((prev) => {
          if (!myUserId) return prev;
          const next = { ...prev };
          if (!next[page]) return next;
          const perPage = { ...next[page] };
          delete perPage[myUserId];
          if (Object.keys(perPage).length === 0) delete next[page];
          else next[page] = perPage;
          return next;
        });
      }

      broadcastPointer(null);
    } else {
      setTool(nextTool);

      if (nextTool !== TOOL_POINTER) {
        const page = isPdf ? pdfCurrentPage : 1;

        if (isTeacher) {
          setTeacherPointerByPage((prev) => {
            const next = { ...prev };
            delete next[page];
            return next;
          });
        } else {
          setLearnerPointersByPage((prev) => {
            if (!myUserId) return prev;
            const next = { ...prev };
            if (!next[page]) return next;
            const perPage = { ...next[page] };
            delete perPage[myUserId];
            if (Object.keys(perPage).length === 0) delete next[page];
            else next[page] = perPage;
            return next;
          });
        }

        broadcastPointer(null);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Render overlay
  // ─────────────────────────────────────────────────────────────
  function renderAnnotationsOverlay() {
    const menusOpen = toolMenuOpen || colorMenuOpen;

    const pointerPage = isPdf ? pdfCurrentPage : 1;
    const teacherPointer = teacherPointerByPage[pointerPage] || null;
    const learnerPointers = learnerPointersByPage[pointerPage] || {};

    const needsInteraction =
      !menusOpen &&
      (tool !== TOOL_NONE ||
        stickyNotes.length > 0 ||
        textBoxes.length > 0 ||
        masks.length > 0);

    const overlayPointerEvents = needsInteraction ? "auto" : "none";
    const overlayTouchAction = needsInteraction ? "none" : "auto";

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
        onTouchMove={(e) => {
          const pt = getTouchPoint(e);
          if (pt) handleMouseMove(pt);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleMouseUp(null);
        }}
      >
        {/* Hidden span for text width measurement */}
        <span
          ref={measureSpanRef}
          style={{
            position: "absolute",
            left: -99999,
            top: -99999,
            visibility: "hidden",
            whiteSpace: "pre",
            pointerEvents: "none",
          }}
        />

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
          onTouchStart={(e) => {
            e.preventDefault();
            const pt = getTouchPoint(e);
            if (pt) handleMouseDown(pt);
          }}
        />

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
                strokeWidth={stroke.tool === TOOL_HIGHLIGHTER ? 0.009 : 0.005}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          {lines
            .filter((l) => !isPdf || l.page === pdfCurrentPage || !l.page)
            .map((l) => (
              <line
                key={l.id}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke={l.color || penColor}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
              />
            ))}

          {boxes
            .filter((b) => !isPdf || b.page === pdfCurrentPage || !b.page)
            .map((b) => (
              <rect
                key={b.id}
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                fill="none"
                stroke={b.color || penColor}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            ))}
        </svg>

        {/* Text boxes - rendered as siblings (no wrapper) for proper z-index stacking */}
        {textBoxes
          .filter((box) => !isPdf || box.page === pdfCurrentPage || !box.page)
          .map((box) => {
            const isEditing = activeTextId === box.id;
            const isResizing = resizeState?.id === box.id;
            const isWidthResizing = widthResizeState?.id === box.id;
            // ✅ Scale font size and width proportionally to container width
            const baseFontSize = box.fontSize || 16;
            const baseWidth = box.width || 150;
            const fontSize = Math.round(baseFontSize * annotationScale);
            const boxWidth = Math.round(baseWidth * annotationScale);

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
                  zIndex: getZIndexFromId(box.id),
                }}
              >
                {isEditing ? (
                  <>
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

                    <div className="prep-text-box__container">
                      <span
                        className="prep-text-box__side-handle prep-text-box__side-handle--left"
                        onMouseDown={(e) => startWidthResize(e, box, "left")}
                      />

                      <div
                        className="prep-text-box__input-area"
                        style={{
                          width: box.autoWidth ? "auto" : `${boxWidth}px`,
                          minWidth: box.autoWidth ? `${boxWidth}px` : undefined,
                        }}
                      >
                        <textarea
                          ref={(el) => {
                            if (el) textAreaRefs.current[box.id] = el;
                          }}
                          data-textbox-id={box.id}
                          className="prep-text-box__textarea"
                          dir="auto"
                          wrap={box.autoWidth ? "off" : "soft"}
                          style={{
                            color: box.color,
                            fontSize: `${fontSize}px`,
                            width: box.autoWidth ? `${boxWidth}px` : "100%",
                            minWidth: box.autoWidth ? "100px" : undefined,
                            whiteSpace: box.autoWidth ? "nowrap" : "pre-wrap",
                            overflowWrap: box.autoWidth
                              ? "normal"
                              : "break-word",
                            wordBreak: "normal",
                            resize: "none",
                            overflow: box.autoWidth ? "visible" : "hidden",
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
                          onInput={() => autoResizeTextarea(box.id)}
                        />

                        <span
                          className="prep-text-box__fontsize-handle"
                          onMouseDown={(e) => startFontSizeResize(e, box)}
                          title="Resize font"
                        />
                      </div>

                      <span
                        className="prep-text-box__side-handle prep-text-box__side-handle--right"
                        onMouseDown={(e) => startWidthResize(e, box, "right")}
                      />
                    </div>
                  </>
                ) : (
                  <div
                    className="prep-text-box__label"
                    dir="auto"
                    style={{
                      color: box.color,
                      fontSize: `${fontSize}px`,
                      width: `${boxWidth}px`,
                      whiteSpace: box.autoWidth ? "nowrap" : "pre-wrap",
                      overflowWrap: box.autoWidth ? "normal" : "break-word",
                      wordBreak: "normal",
                      overflowX: "visible",
                      overflowY: "visible",
                    }}
                    onMouseDown={(e) => startTextDrag(e, box)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setActiveTextId(box.id);
                      setTimeout(() => autoResizeTextarea(box.id), 0);
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
                zIndex: getZIndexFromId(note.id),
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
                dir="auto"
                placeholder={t(dict, "resources_prep_note_placeholder")}
                value={note.text}
                onChange={(e) => updateNoteText(note.id, e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
          ))}

        {/* Masks */}
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
                pointerEvents: tool === TOOL_ERASER ? "none" : "auto",
                // Masks always render above text/notes (base 100) for consistent hiding
                zIndex: 100 + getZIndexFromId(mask.id),
              }}
              onMouseDown={(e) => startMaskMove(e, mask)}
            />
          ))}
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
              pointerEvents: "none",
            }}
          />
        )}
        {shapeDrag &&
          shapeDrag.mode === "creating" &&
          shapeDrag.tool === TOOL_LINE && (
            <svg
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 9997, // keep it above page content
              }}
              width="100%"
              height="100%"
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
            >
              <line
                x1={shapeDrag.startX}
                y1={shapeDrag.startY}
                x2={shapeDrag.currentX}
                y2={shapeDrag.currentY}
                stroke={penColor}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
              />
            </svg>
          )}

        {shapeDrag &&
          shapeDrag.mode === "creating" &&
          shapeDrag.tool === TOOL_BOX && (
            <svg
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 9997,
              }}
              width="100%"
              height="100%"
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
            >
              <rect
                x={Math.min(shapeDrag.startX, shapeDrag.currentX)}
                y={Math.min(shapeDrag.startY, shapeDrag.currentY)}
                width={Math.abs(shapeDrag.currentX - shapeDrag.startX)}
                height={Math.abs(shapeDrag.currentY - shapeDrag.startY)}
                fill="none"
                stroke={penColor}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}

        {/* Teacher pointer */}
        {!menusOpen && teacherPointer && (
          <svg
            style={{
              position: "absolute",
              left: `${teacherPointer.x * 100}%`,
              top: `${teacherPointer.y * 100}%`,
              transform: "translate(-100%, -50%)",
              pointerEvents: "none",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
              animation: "blink 1s ease-in-out infinite",
              zIndex: 9999,
            }}
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M4 12H17M17 12L12 7M17 12L12 17"
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Learner pointers */}
        {!menusOpen &&
          Object.entries(learnerPointers).map(([uid, pos]) => (
            <svg
              key={uid}
              style={{
                position: "absolute",
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                transform: "translate(-100%, -50%)",
                pointerEvents: "none",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
                zIndex: 9998,
              }}
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M4 12H17M17 12L12 7M17 12L12 17"
                stroke={colorForId(uid)}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Viewer activity flag
  // ─────────────────────────────────────────────────────────────
  const viewerIsActive = hasScreenShare || !!viewerUrl;

  // ─────────────────────────────────────────────────────────────
  // Audio tracks (single + multiple)
  // ─────────────────────────────────────────────────────────────
  const audioTracks = [];

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
  // Current tool meta
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
            : tool === TOOL_LINE
              ? "📏"
              : tool === TOOL_BOX
                ? "🟥"
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
            : tool === TOOL_LINE
              ? "Straight Line"
              : tool === TOOL_BOX
                ? "Border Box"
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
          <Link href={`${prefix}/resources`} className="unit-breadcrumbs__link">
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
                href={`${prefix}/resources`}
                className="resources-button resources-button--ghost"
              >
                {t(dict, "resources_prep_info_back_to_picker")}
              </Link>
              {unit?.slug && (
                <Link
                  href={`${prefix}/resources/units/${unit.slug}`}
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
                            sendAudioState({
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

                    <button
                      type="button"
                      className="prep-annotate-toolbar__btn prep-annotate-toolbar__btn--audio"
                      onClick={() => {
                        const el = audioRef.current;
                        if (!el) return;

                        if (isAudioPlaying) {
                          // ✅ Broadcast pause BEFORE local pause for instant learner sync
                          if (isTeacher) sendAudioState({ playing: false });
                          el.pause();
                          setIsAudioPlaying(false);
                        } else {
                          // ✅ Broadcast play BEFORE local play for instant learner sync
                          if (isTeacher) sendAudioState({ playing: true });
                          el.play().then(
                            () => {
                              setIsAudioPlaying(true);
                            },
                            () => setIsAudioPlaying(false)
                          );
                        }
                      }}
                      aria-label={isAudioPlaying ? "Pause audio" : "Play audio"}
                    >
                      {isAudioPlaying ? "⏸" : "▶️"}
                    </button>

                    {needsAudioUnlock && (
                      <button
                        type="button"
                        className="prep-annotate-toolbar__btn prep-annotate-toolbar__btn--audio"
                        onClick={() => {
                          const el = audioRef.current;
                          if (!el) return;
                          el.play().then(
                            () => {
                              setIsAudioPlaying(true);
                              setNeedsAudioUnlock(false);
                              if (isTeacher) {
                                sendAudioState({
                                  trackIndex: safeTrackIndex,
                                  time: el.currentTime || 0,
                                  playing: true,
                                });
                              }
                            },
                            () => { }
                          );
                        }}
                        aria-label="Enable audio"
                        title="Enable audio"
                      >
                        🔊
                      </button>
                    )}

                    <button
                      type="button"
                      className="prep-annotate-toolbar__btn prep-annotate-toolbar__btn--audio-restart"
                      onClick={() => {
                        const el = audioRef.current;
                        if (!el) return;

                        el.currentTime = 0;

                        if (isTeacher && channelReady && sendOnChannel) {
                          sendAudioState({
                            trackIndex: safeTrackIndex,
                            time: 0,
                            playing: true,
                          });
                        }

                        el.play().then(
                          () => {
                            setIsAudioPlaying(true);

                            if (isTeacher && channelReady && sendOnChannel) {
                              sendAudioState({
                                trackIndex: safeTrackIndex,
                                time: 0,
                                playing: true,
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

                    <audio
                      ref={audioRef}
                      src={currentTrack ? currentTrack.url : undefined}
                      style={{ display: "none" }}
                    />
                  </>
                )}

                {/* TOOL DROPDOWN */}
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
                          (tool === TOOL_LINE ? " is-active" : "")
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setToolSafe(TOOL_LINE);
                          setToolMenuOpen(false);
                        }}
                      >
                        📏 <span>Straight Line</span>
                      </button>
                      <button
                        type="button"
                        className={
                          "prep-annotate-toolbar__btn prep-annotate-toolbar__btn--dropdown" +
                          (tool === TOOL_BOX ? " is-active" : "")
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setToolSafe(TOOL_BOX);
                          setToolMenuOpen(false);
                        }}
                      >
                        🟥 <span>Border Box</span>
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
                  <div className="prep-viewer__canvas-container">
                    <PdfViewerWithSidebar
                      fileUrl={pdfViewerUrl}
                      onFatalError={(err) => {
                        console.error("PDF failed to load in pdf.js", err);
                      }}
                      onContainerReady={(el) => {
                        containerRef.current = el;
                      }}
                      onScrollContainerReady={(el) => {
                        pdfScrollRef.current = el;
                      }}
                      onNavStateChange={handlePdfNavStateChange}
                      onFitToPage={() => {
                        // teacher clicked the internal PDF “fit to page” button
                        broadcastPdfFitToPage();
                      }}
                      hideControls={false}
                      hideSidebar={false}
                      locale={locale}
                    >
                      {renderAnnotationsOverlay()}
                    </PdfViewerWithSidebar>
                  </div>
                ) : (
                  <div
                    className="prep-viewer__canvas-container"
                    ref={containerRef}
                  >
                    <iframe
                      src={viewerUrl}
                      className="prep-viewer__frame"
                      title={`${resource.title} – ${viewer?.label || "Viewer"}`}
                      allow={
                        viewer?.type === "youtube"
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
