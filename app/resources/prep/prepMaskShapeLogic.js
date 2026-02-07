// app/resources/prep/prepMaskShapeLogic.js

import { TOOL_LINE, TOOL_BOX } from "./prepAnnotationUtils";

export function startPrepMaskMove(e, mask, ctx) {
  const { getNormalizedPoint, setMaskDrag } = ctx;

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

export function deletePrepMask(id, ctx) {
  const { setMasks, scheduleSaveAnnotations, scheduleBroadcastAnnotations } = ctx;

  setMasks((prev) => {
    const next = prev.filter((m) => m.id !== id);
    scheduleSaveAnnotations({ masks: next });
    scheduleBroadcastAnnotations({ masks: next });
    return next;
  });
}

export function finalizePrepCreatingMask(endPoint, ctx) {
  const {
    maskDrag,
    setMaskDrag,
    isPdf,
    pdfCurrentPage,
    pushHistory,
    setMasks,
    scheduleSaveAnnotations,
    scheduleBroadcastAnnotations,
  } = ctx;

  if (!maskDrag || maskDrag.mode !== "creating") return;

  const startX = maskDrag.startX;
  const startY = maskDrag.startY;
  const endX = endPoint?.x ?? maskDrag.currentX;
  const endY = endPoint?.y ?? maskDrag.currentY;

  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

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

  pushHistory();

  setMasks((prev) => {
    const next = [...prev, newMask];
    scheduleSaveAnnotations({ masks: next });
    scheduleBroadcastAnnotations({ masks: next });
    return next;
  });

  setMaskDrag(null);
}

export function finalizePrepCreatingShape(endPoint, ctx) {
  const {
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
  } = ctx;

  if (!shapeDrag || shapeDrag.mode !== "creating") return;

  const startX = shapeDrag.startX;
  const startY = shapeDrag.startY;
  const endX = endPoint?.x ?? shapeDrag.currentX;
  const endY = endPoint?.y ?? shapeDrag.currentY;
  const page = isPdf ? pdfCurrentPage : 1;
  const MIN_DIST = 0.01;
  const dx = Math.abs(endX - startX);
  const dy = Math.abs(endY - startY);

  if (dx < MIN_DIST && dy < MIN_DIST) {
    setShapeDrag(null);
    return;
  }

  pushHistory();

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
