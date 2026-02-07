// app/resources/prep/prepInputHandlers.js

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
  clamp,
} from "./prepAnnotationUtils";

function clearCurrentPagePointer(ctx) {
  const {
    isPdf,
    pdfCurrentPage,
    isTeacher,
    myUserId,
    setTeacherPointerByPage,
    setLearnerPointersByPage,
    broadcastPointer,
  } = ctx;

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

export function getPrepNormalizedPoint(event, ctx) {
  const { containerRef, showGrid } = ctx;

  const container = containerRef.current;
  if (!container) return null;

  const rect = container.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;

  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  let nx = x;
  let ny = y;

  if (showGrid) {
    const cell = 20;
    const px = x * rect.width;
    const py = y * rect.height;
    nx = (Math.round(px / cell) * cell) / rect.width;
    ny = (Math.round(py / cell) * cell) / rect.height;
  }

  return {
    x: Math.min(0.999, Math.max(0.001, nx)),
    y: Math.min(0.999, Math.max(0.001, ny)),
  };
}

export function getPrepCanvasCoordinates(event, ctx) {
  const { containerRef, canvasRef } = ctx;

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

export function handlePrepTouchStartGesture(e, ctx) {
  const { gestureRef, viewport } = ctx;

  if (e.touches.length === 2) {
    e.preventDefault();
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const cx = (t1.clientX + t2.clientX) / 2;
    const cy = (t1.clientY + t2.clientY) / 2;

    gestureRef.current = {
      startDist: dist,
      startScale: viewport.scale,
      startX: cx,
      startY: cy,
      initialViewport: { ...viewport },
      active: true,
    };

    return true;
  }

  return false;
}

export function handlePrepGestureMove(e, ctx) {
  const { gestureRef, setViewport } = ctx;

  if (!gestureRef.current.active || e.touches.length !== 2) return;

  e.preventDefault();
  const t1 = e.touches[0];
  const t2 = e.touches[1];
  const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  const cx = (t1.clientX + t2.clientX) / 2;
  const cy = (t1.clientY + t2.clientY) / 2;

  const scaleFactor = dist / (gestureRef.current.startDist || 1);
  const newScale = clamp(gestureRef.current.startScale * scaleFactor, 0.5, 5);

  const dx = cx - gestureRef.current.startX;
  const dy = cy - gestureRef.current.startY;

  setViewport({
    x: gestureRef.current.initialViewport.x + dx,
    y: gestureRef.current.initialViewport.y + dy,
    scale: newScale,
  });
}

export function handlePrepMouseDown(e, ctx) {
  const {
    tool,
    setLastInputWasTouch,
    activeStylusRef,
    palmRejectionTimeoutRef,
    getNormalizedPoint,
    handleSelectionPointerDown,
    selectionCtx,
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
  } = ctx;

  const target = e.target;

  const isTouch = e.pointerType === "touch" || e.type?.includes("touch");
  const isPen = e.pointerType === "pen";
  setLastInputWasTouch(isTouch);

  if (isPen) {
    activeStylusRef.current = true;
    if (palmRejectionTimeoutRef.current) {
      clearTimeout(palmRejectionTimeoutRef.current);
    }
    palmRejectionTimeoutRef.current = setTimeout(() => {
      activeStylusRef.current = false;
    }, 500);
  } else if (isTouch && activeStylusRef.current) {
    e.preventDefault();
    return;
  }

  const isOnInteractiveElement =
    target.closest &&
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

    if (tool === TOOL_SELECT) {
      handleSelectionPointerDown(p, selectionCtx);
      return;
    }

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

  if (tool === TOOL_PEN || tool === TOOL_HIGHLIGHTER || tool === TOOL_ERASER) {
    e.preventDefault();
    startDrawing(e);
    return;
  }

  if (tool === TOOL_NOTE) {
    e.preventDefault();
    handleClickForNote(e);
  }
}

export function handlePrepMouseMove(e, ctx) {
  const {
    activeStylusRef,
    resizeState,
    widthResizeState,
    handleFontSizeResize,
    handleWidthResize,
    groupDrag,
    getNormalizedPoint,
    handleGroupDragMove,
    groupDragCtx,
    selectionBox,
    handleSelectionBoxMove,
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
  } = ctx;

  const isTouch = e.pointerType === "touch" || e.type?.includes("touch");
  if (isTouch && activeStylusRef.current) {
    e.preventDefault();
    return;
  }

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

  if (groupDrag) {
    e.preventDefault();
    const p = getNormalizedPoint(e);
    if (p) {
      handleGroupDragMove(p, groupDragCtx);
    }
    return;
  }

  if (selectionBox) {
    e.preventDefault();
    const p = getNormalizedPoint(e);
    if (p) {
      handleSelectionBoxMove(p, setSelectionBox);
    }
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

  if (tool === TOOL_PEN || tool === TOOL_HIGHLIGHTER || tool === TOOL_ERASER) {
    e.preventDefault();
    draw(e);
  }
}

export function handlePrepMouseUp(e, ctx) {
  const {
    groupDrag,
    finalizeGroupDrag,
    finalizeGroupDragCtx,
    selectionBox,
    finalizeSelectionBox,
    finalizeSelectionBoxCtx,
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
  } = ctx;

  if (groupDrag) {
    finalizeGroupDrag(finalizeGroupDragCtx);
    return;
  }

  if (selectionBox) {
    if (e) e.preventDefault();
    finalizeSelectionBox(finalizeSelectionBoxCtx);
    return;
  }

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

export function setPrepToolSafe(nextTool, ctx) {
  const { tool, setTool } = ctx;

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(5);
  }

  if (tool === nextTool) {
    setTool(TOOL_NONE);
    clearCurrentPagePointer(ctx);
    return;
  }

  setTool(nextTool);

  if (nextTool !== TOOL_POINTER) {
    clearCurrentPagePointer(ctx);
  }
}
