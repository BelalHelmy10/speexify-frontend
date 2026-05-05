// app/resources/prep/prepTextBoxLogic.js

import { TOOL_SELECT, isTextRTL } from "./prepAnnotationUtils";

const TEXT_RESIZE_PADDING_PX = 8;
const TEXT_RESIZE_VERTICAL_PADDING_PX = 8;
const TEXT_RESIZE_MIN_WIDTH_PX = 56;
const TEXT_RESIZE_MIN_HEIGHT_PX = 36;
const TEXT_RESIZE_MIN_FONT_SIZE = 8;
const TEXT_RESIZE_MAX_FONT_SIZE = 120;

function clampNumber(value, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

function roundNormalized(value) {
  return Math.round(value * 100000) / 100000;
}

function getTextResizeFrame(box, rect, annotationScale = 1) {
  const containerWidth = Math.max(rect?.width || 1000, 1);
  const scale = annotationScale > 0 ? annotationScale : 1;
  const padding = Math.min(TEXT_RESIZE_PADDING_PX, Math.max(0, containerWidth / 4));
  const maxWidth = Math.max(TEXT_RESIZE_MIN_WIDTH_PX, containerWidth - padding * 2);
  const minWidth = Math.min(
    Math.max((box.minWidth || TEXT_RESIZE_MIN_WIDTH_PX) * scale, TEXT_RESIZE_MIN_WIDTH_PX),
    maxWidth
  );
  const startWidth = clampNumber((box.width || 150) * scale, minWidth, maxWidth);
  const startCenterPx = clampNumber(
    (box.x ?? 0.5) * containerWidth,
    startWidth / 2,
    containerWidth - startWidth / 2
  );

  return {
    containerWidth,
    scale,
    padding,
    minWidth,
    maxWidth,
    startWidth,
    startCenterPx,
    startBoxX: startCenterPx / containerWidth,
    startLeft: startCenterPx - startWidth / 2,
    startRight: startCenterPx + startWidth / 2,
  };
}

function getResizedBoxFromEdges(leftPx, rightPx, state) {
  const width = clampNumber(rightPx - leftPx, state.minWidth, state.maxWidth);
  const centerPx = leftPx + width / 2;
  const x = clampNumber(centerPx / state.containerWidth, 0, 1);

  return {
    x: roundNormalized(x),
    width: Math.round(width / state.scale),
  };
}

function getTextHeightResizeFrame(box, rect, annotationScale = 1, renderedHeight = null) {
  const containerHeight = Math.max(rect?.height || 1000, 1);
  const scale = annotationScale > 0 ? annotationScale : 1;
  const padding = Math.min(
    TEXT_RESIZE_VERTICAL_PADDING_PX,
    Math.max(0, containerHeight / 4)
  );
  const maxHeight = Math.max(
    TEXT_RESIZE_MIN_HEIGHT_PX,
    containerHeight - padding * 2
  );
  const minHeight = Math.min(
    Math.max(
      (box.minHeight || TEXT_RESIZE_MIN_HEIGHT_PX) * scale,
      TEXT_RESIZE_MIN_HEIGHT_PX
    ),
    maxHeight
  );
  const measuredHeight =
    typeof renderedHeight === "number" && Number.isFinite(renderedHeight)
      ? renderedHeight
      : null;
  const startHeight = clampNumber(
    measuredHeight || (box.height || 80) * scale,
    minHeight,
    maxHeight
  );
  const startCenterPx = clampNumber(
    (box.y ?? 0.5) * containerHeight,
    startHeight / 2,
    containerHeight - startHeight / 2
  );

  return {
    containerHeight,
    scale,
    padding,
    minHeight,
    maxHeight,
    startHeight,
    startCenterPx,
    startBoxY: startCenterPx / containerHeight,
    startTop: startCenterPx - startHeight / 2,
    startBottom: startCenterPx + startHeight / 2,
  };
}

function getResizedBoxFromVerticalEdges(topPx, bottomPx, state) {
  const height = clampNumber(bottomPx - topPx, state.minHeight, state.maxHeight);
  const centerPx = topPx + height / 2;
  const y = clampNumber(centerPx / state.containerHeight, 0, 1);

  return {
    y: roundNormalized(y),
    height: Math.round(height / state.scale),
  };
}

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
    setHeightResizeState,
    setTextBoxes,
    setResizeState,
    annotationScale,
  } = ctx;

  e.stopPropagation();
  e.preventDefault();

  const container = containerRef.current || canvasRef.current;
  const rect = container?.getBoundingClientRect();
  const frame = getTextResizeFrame(box, rect, annotationScale);

  setWidthResizeState(null);
  if (typeof setHeightResizeState === "function") setHeightResizeState(null);
  setTextBoxes((prev) =>
    prev.map((t) => (t.id === box.id ? { ...t, autoWidth: false } : t))
  );

  setResizeState({
    id: box.id,
    startX: e.clientX,
    startY: e.clientY,
    startFontSize: box.fontSize || 16,
    ...frame,
  });
}

export function handlePrepFontSizeResize(e, ctx) {
  const {
    resizeState,
    setTextBoxes,
    scheduleSaveAnnotations,
    scheduleBroadcastAnnotations,
    autoResizeTextarea,
  } = ctx;

  if (!resizeState) return;

  const deltaX = e.clientX - resizeState.startX;
  const deltaY = e.clientY - resizeState.startY;
  const newFontSize = clampNumber(
    resizeState.startFontSize + (deltaY * 0.16 + deltaX * 0.04) / resizeState.scale,
    TEXT_RESIZE_MIN_FONT_SIZE,
    TEXT_RESIZE_MAX_FONT_SIZE
  );

  const fixedLeft = clampNumber(
    resizeState.startLeft,
    resizeState.padding,
    resizeState.containerWidth - resizeState.minWidth - resizeState.padding
  );
  const rightLimit = resizeState.containerWidth - resizeState.padding;
  const movingRight = clampNumber(
    resizeState.startRight + deltaX,
    fixedLeft + resizeState.minWidth,
    rightLimit
  );
  const resizedBox = getResizedBoxFromEdges(fixedLeft, movingRight, resizeState);

  setTextBoxes((prev) => {
    const updated = prev.map((tbox) => {
      if (tbox.id !== resizeState.id) return tbox;

      return {
        ...tbox,
        ...resizedBox,
        fontSize: roundToTenth(newFontSize),
        autoWidth: false,
      };
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
  const {
    containerRef,
    canvasRef,
    setWidthResizeState,
    setHeightResizeState,
    setTextBoxes,
    annotationScale,
  } = ctx;

  e.stopPropagation();
  e.preventDefault();

  const container = containerRef.current || canvasRef.current;
  const rect = container?.getBoundingClientRect();
  const frame = getTextResizeFrame(box, rect, annotationScale);

  if (typeof setHeightResizeState === "function") setHeightResizeState(null);
  setWidthResizeState({
    id: box.id,
    startX: e.clientX,
    direction,
    ...frame,
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
    scheduleSaveAnnotations,
    scheduleBroadcastAnnotations,
    autoResizeTextarea,
  } = ctx;

  if (!widthResizeState) return;

  const deltaX = e.clientX - widthResizeState.startX;

  setTextBoxes((prev) => {
    const updated = prev.map((tbox) => {
      if (tbox.id !== widthResizeState.id) return tbox;

      let leftPx = widthResizeState.startLeft;
      let rightPx = widthResizeState.startRight;

      if (widthResizeState.direction === "right") {
        leftPx = clampNumber(
          widthResizeState.startLeft,
          widthResizeState.padding,
          widthResizeState.containerWidth - widthResizeState.minWidth - widthResizeState.padding
        );
        rightPx = clampNumber(
          widthResizeState.startRight + deltaX,
          leftPx + widthResizeState.minWidth,
          widthResizeState.containerWidth - widthResizeState.padding
        );
      } else {
        rightPx = clampNumber(
          widthResizeState.startRight,
          widthResizeState.minWidth + widthResizeState.padding,
          widthResizeState.containerWidth - widthResizeState.padding
        );
        leftPx = clampNumber(
          widthResizeState.startLeft + deltaX,
          widthResizeState.padding,
          rightPx - widthResizeState.minWidth
        );
      }

      return {
        ...tbox,
        ...getResizedBoxFromEdges(leftPx, rightPx, widthResizeState),
        autoWidth: false,
      };
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

export function startPrepHeightResize(e, box, direction, ctx) {
  const {
    containerRef,
    canvasRef,
    setWidthResizeState,
    setHeightResizeState,
    setTextBoxes,
    annotationScale,
  } = ctx;

  e.stopPropagation();
  e.preventDefault();

  const container = containerRef.current || canvasRef.current;
  const rect = container?.getBoundingClientRect();
  const renderedHeight =
    e.currentTarget
      ?.closest(".prep-text-box__input-area")
      ?.getBoundingClientRect().height || null;
  const frame = getTextHeightResizeFrame(
    box,
    rect,
    annotationScale,
    renderedHeight
  );

  setWidthResizeState(null);
  setHeightResizeState({
    id: box.id,
    startY: e.clientY,
    direction,
    ...frame,
  });

  setTextBoxes((prev) =>
    prev.map((tbox) =>
      tbox.id === box.id ? { ...tbox, autoWidth: false } : tbox
    )
  );
}

export function handlePrepHeightResize(e, ctx) {
  const {
    heightResizeState,
    setTextBoxes,
    scheduleSaveAnnotations,
    scheduleBroadcastAnnotations,
    autoResizeTextarea,
  } = ctx;

  if (!heightResizeState) return;

  const deltaY = e.clientY - heightResizeState.startY;

  setTextBoxes((prev) => {
    const updated = prev.map((tbox) => {
      if (tbox.id !== heightResizeState.id) return tbox;

      let topPx = heightResizeState.startTop;
      let bottomPx = heightResizeState.startBottom;

      if (heightResizeState.direction === "bottom") {
        topPx = clampNumber(
          heightResizeState.startTop,
          heightResizeState.padding,
          heightResizeState.containerHeight -
            heightResizeState.minHeight -
            heightResizeState.padding
        );
        bottomPx = clampNumber(
          heightResizeState.startBottom + deltaY,
          topPx + heightResizeState.minHeight,
          heightResizeState.containerHeight - heightResizeState.padding
        );
      } else {
        bottomPx = clampNumber(
          heightResizeState.startBottom,
          heightResizeState.minHeight + heightResizeState.padding,
          heightResizeState.containerHeight - heightResizeState.padding
        );
        topPx = clampNumber(
          heightResizeState.startTop + deltaY,
          heightResizeState.padding,
          bottomPx - heightResizeState.minHeight
        );
      }

      return {
        ...tbox,
        ...getResizedBoxFromVerticalEdges(topPx, bottomPx, heightResizeState),
        autoWidth: false,
      };
    });

    scheduleSaveAnnotations({ textBoxes: updated });
    scheduleBroadcastAnnotations({ textBoxes: updated });
    return updated;
  });

  setTimeout(() => autoResizeTextarea(heightResizeState.id), 0);
}

export function stopPrepHeightResize(ctx) {
  const {
    heightResizeState,
    setHeightResizeState,
    saveAnnotations,
    broadcastAnnotations,
  } = ctx;

  if (!heightResizeState) return;
  setHeightResizeState(null);
  saveAnnotations({}, { includeCanvas: true });
  broadcastAnnotations({}, { includeCanvas: true });
}
