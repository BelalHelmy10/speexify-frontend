// app/resources/prep/prepTextBoxLogic.js

import { TOOL_SELECT, isTextRTL } from "./prepAnnotationUtils";

export function createPrepTextBox(e, ctx) {
  const {
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
  } = ctx;

  const p = getNormalizedPoint(e);
  if (!p) return;

  const box = {
    id: `text_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    x: p.x,
    y: p.y,
    text: "",
    color: penColor,
    fontSize: 13,
    width: 120,
    minWidth: 60,
    autoWidth: true,
    dir: "ltr",
    page: isPdf ? pdfCurrentPage : 1,
  };

  pushHistory();

  const next = [...textBoxes, box];
  setTextBoxes(next);
  setActiveTextId(box.id);
  scheduleSaveAnnotations({ textBoxes: next });
  scheduleBroadcastAnnotations({ textBoxes: next });

  setTimeout(() => autoResizeTextarea(box.id), 0);
}

export function updatePrepTextBoxText(id, text, ctx) {
  const {
    setTextBoxes,
    autoFitTextBoxWidthIfNeeded,
    scheduleSaveAnnotations,
    scheduleBroadcastAnnotations,
    autoResizeTextarea,
  } = ctx;

  setTextBoxes((prev) => {
    const updated = prev.map((tbox) => {
      if (tbox.id !== id) return tbox;

      let detectedDir = tbox.dir || "ltr";
      if (text && text.length > 0 && (!tbox.text || tbox.text.length === 0)) {
        detectedDir = isTextRTL(text) ? "rtl" : "ltr";
      }

      const withText = { ...tbox, text, dir: detectedDir };
      return autoFitTextBoxWidthIfNeeded(withText, text);
    });

    scheduleSaveAnnotations({ textBoxes: updated });
    scheduleBroadcastAnnotations({ textBoxes: updated });

    return updated;
  });

  setTimeout(() => autoResizeTextarea(id), 0);
}

export function deletePrepTextBox(id, ctx) {
  const {
    textBoxes,
    setTextBoxes,
    scheduleSaveAnnotations,
    scheduleBroadcastAnnotations,
    activeTextId,
    setActiveTextId,
    textAreaRefs,
  } = ctx;

  const next = textBoxes.filter((t) => t.id !== id);
  setTextBoxes(next);
  scheduleSaveAnnotations({ textBoxes: next });
  scheduleBroadcastAnnotations({ textBoxes: next });

  if (activeTextId === id) setActiveTextId(null);
  if (textAreaRefs.current?.[id]) delete textAreaRefs.current[id];
}

export function startPrepTextDrag(e, box, ctx) {
  const { tool, getCanvasCoordinates, setDragState } = ctx;

  if (tool === TOOL_SELECT) return;

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

export function startPrepFontSizeResize(e, box, ctx) {
  const {
    containerRef,
    canvasRef,
    setWidthResizeState,
    setTextBoxes,
    setResizeState,
  } = ctx;

  e.stopPropagation();
  e.preventDefault();

  const container = containerRef.current || canvasRef.current;
  const rect = container?.getBoundingClientRect();

  setWidthResizeState(null);
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

export function handlePrepFontSizeResize(e, ctx) {
  const {
    resizeState,
    setTextBoxes,
    measureTextWidthPx,
    autoFitTextBoxWidthIfNeeded,
    scheduleSaveAnnotations,
    scheduleBroadcastAnnotations,
    autoResizeTextarea,
  } = ctx;

  if (!resizeState) return;

  const deltaX = e.clientX - resizeState.startX;
  const deltaY = e.clientY - resizeState.startY;
  const newFontSize = Math.max(
    10,
    Math.min(120, resizeState.startFontSize + deltaY * 0.2)
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

    scheduleSaveAnnotations({ textBoxes: updated });
    scheduleBroadcastAnnotations({ textBoxes: updated });
    return updated;
  });

  setTimeout(() => autoResizeTextarea(resizeState.id), 0);
}

export function stopPrepFontSizeResize(ctx) {
  const { resizeState, setResizeState, saveAnnotations, broadcastAnnotations } = ctx;

  if (!resizeState) return;
  setResizeState(null);
  saveAnnotations({}, { includeCanvas: true });
  broadcastAnnotations({}, { includeCanvas: true });
}

export function startPrepWidthResize(e, box, direction, ctx) {
  const { containerRef, canvasRef, setWidthResizeState, setTextBoxes } = ctx;

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

  setTextBoxes((prev) =>
    prev.map((tbox) =>
      tbox.id === box.id ? { ...tbox, autoWidth: false } : tbox
    )
  );
}

export function handlePrepWidthResize(e, ctx) {
  const {
    widthResizeState,
    setTextBoxes,
    measureTextWidthPx,
    autoFitTextBoxWidthIfNeeded,
    scheduleSaveAnnotations,
    scheduleBroadcastAnnotations,
    autoResizeTextarea,
  } = ctx;

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
        nextX = widthResizeState.startBoxX + shiftNorm;
      } else {
        newWidth = Math.max(minW, widthResizeState.startWidth - deltaX);
        widthChange = newWidth - widthResizeState.startWidth;
        const shiftNorm = -widthChange / 2 / widthResizeState.containerWidth;
        nextX = widthResizeState.startBoxX + shiftNorm;
      }

      const maxW = widthResizeState.containerWidth * 0.95;
      newWidth = Math.min(newWidth, maxW);

      const withWidth = { ...tbox, x: nextX, width: Math.round(newWidth) };

      const measured = measureTextWidthPx(withWidth.text, {
        fontSize: withWidth.fontSize || 16,
      });
      const desired = measured + 40;

      if (newWidth >= desired) {
        return autoFitTextBoxWidthIfNeeded(
          { ...withWidth, autoWidth: true, width: desired },
          withWidth.text
        );
      }

      return { ...withWidth, autoWidth: false };
    });

    scheduleSaveAnnotations({ textBoxes: updated });
    scheduleBroadcastAnnotations({ textBoxes: updated });
    return updated;
  });

  setTimeout(() => autoResizeTextarea(widthResizeState.id), 0);
}

export function stopPrepWidthResize(ctx) {
  const {
    widthResizeState,
    setWidthResizeState,
    saveAnnotations,
    broadcastAnnotations,
  } = ctx;

  if (!widthResizeState) return;
  setWidthResizeState(null);
  saveAnnotations({}, { includeCanvas: true });
  broadcastAnnotations({}, { includeCanvas: true });
}
