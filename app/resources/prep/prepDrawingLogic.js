// app/resources/prep/prepDrawingLogic.js

import {
  TOOL_PEN,
  TOOL_HIGHLIGHTER,
  TOOL_ERASER,
} from "./prepAnnotationUtils";

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
  } = ctx;

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
        scheduleBroadcastAnnotations({ strokes: nextStrokes });

        setIsDrawing(false);
        setCurrentStrokeId(null);

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(10);
        }
        return;
      }
    }
  }

  setIsDrawing(false);
  setCurrentStrokeId(null);

  if (dragState) setDragState(null);
  if (maskDrag) setMaskDrag(null);

  scheduleSaveAnnotations({});
  scheduleBroadcastAnnotations({});
}
