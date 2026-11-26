// app/resources/prep/prepDrawingLogic.js

import {
  TOOL_PEN,
  TOOL_HIGHLIGHTER,
  TOOL_ERASER,
} from "./prepAnnotationUtils";
import { quantizePoint, shouldAppendPoint } from "@/lib/classroomAnnotationSync.mjs";

export function startPrepDrawing(e, ctx) {
  const {
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
    onStrokeProgress,
  } = ctx;

  if (tool === TOOL_ERASER) {
    e.preventDefault();
    setIsDrawing(true);
    eraseAtPoint(e);
    return;
  }

  if (tool !== TOOL_PEN && tool !== TOOL_HIGHLIGHTER) return;

  const rawPoint = getNormalizedPoint(e);
  if (!rawPoint) return;
  const p = quantizePoint(rawPoint);

  const id = `stroke_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  pushHistory();

  const stroke = {
    id,
    tool,
    color: penColor,
    points: [p],
    page: isPdf ? pdfCurrentPage : 1,
    strokeWidth: tool === TOOL_HIGHLIGHTER ? 12 : penStrokeWidth,
  };

  setStrokes((prev) => [...prev, stroke]);
  setCurrentStrokeId(id);
  setIsDrawing(true);
  onStrokeProgress?.(id);
}

export function drawPrepStrokeOrDrag(e, ctx) {
  const {
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
    onStrokeProgress,
  } = ctx;

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

  const rawPoint = getNormalizedPoint(e);
  if (!rawPoint) return;
  const p = quantizePoint(rawPoint);

  setStrokes((prev) =>
    prev.map((stroke) => {
      if (stroke.id !== currentStrokeId) return stroke;
      const last = stroke.points[stroke.points.length - 1];

      if (stroke.tool === TOOL_HIGHLIGHTER && stroke.points.length > 0) {
        const firstY = stroke.points[0].y;
        const next = { x: p.x, y: firstY };
        if (!shouldAppendPoint(last, next)) return stroke;
        return {
          ...stroke,
          points: [...stroke.points, next],
        };
      }

      // Pointer events fire far more often than ink needs; skipping
      // sub-pixel moves keeps strokes (and every sync message) small.
      if (!shouldAppendPoint(last, p)) return stroke;
      return {
        ...stroke,
        points: [...stroke.points, p],
      };
    })
  );
  onStrokeProgress?.(currentStrokeId);
}

export function stopPrepDrawing(ctx) {
  const {
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
    broadcastStrokeFinished,
  } = ctx;

  if (!isDrawing && !dragState && !maskDrag) return;

  if (isDrawing && currentStrokeId && (tool === TOOL_PEN || tool === TOOL_HIGHLIGHTER)) {
    const sIndex = strokes.findIndex((s) => s.id === currentStrokeId);
    if (sIndex !== -1) {
      const rawStroke = strokes[sIndex];
      const correctedPoints = getDetectedShape(rawStroke.points);

      if (correctedPoints) {
        const nextStrokes = [...strokes];
        nextStrokes[sIndex] = { ...rawStroke, points: correctedPoints };
        setStrokes(nextStrokes);

        scheduleSaveAnnotations({ strokes: nextStrokes });
        if (broadcastStrokeFinished) broadcastStrokeFinished(nextStrokes[sIndex]);
        else scheduleBroadcastAnnotations({ strokes: nextStrokes });

        setIsDrawing(false);
        setCurrentStrokeId(null);

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(10);
        }
        return;
      }
    }
  }

  const finishedPenStroke =
    isDrawing && currentStrokeId && (tool === TOOL_PEN || tool === TOOL_HIGHLIGHTER) && !dragState && !maskDrag
      ? strokes.find((s) => s.id === currentStrokeId)
      : null;

  setIsDrawing(false);
  setCurrentStrokeId(null);

  if (dragState) setDragState(null);
  if (maskDrag) setMaskDrag(null);

  scheduleSaveAnnotations({});
  // A finished pen stroke is sent on its own (small); other edits (drags,
  // erasing, masks) still send the full state.
  if (finishedPenStroke && broadcastStrokeFinished) broadcastStrokeFinished(finishedPenStroke);
  else scheduleBroadcastAnnotations({});
}
