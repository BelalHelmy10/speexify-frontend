// app/resources/prep/prepClearLogic.js

export function openPrepClearConfirm(setShowClearConfirm) {
  setShowClearConfirm(true);
}

export function closePrepClearConfirm(setShowClearConfirm) {
  setShowClearConfirm(false);
}

export function confirmPrepClearAll(ctx) {
  const {
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
  } = ctx;

  setShowClearConfirm(false);

  pushHistory();

  const page = isPdf ? pdfCurrentPage : 1;

  const canvas = canvasRef.current;
  if (canvas) {
    const drawContext = canvas.getContext("2d");
    if (drawContext) drawContext.clearRect(0, 0, canvas.width, canvas.height);
  }

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
