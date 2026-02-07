// app/resources/prep/prepPersistenceLogic.js

import {
  savePrepAnnotationsToStorage,
  buildPrepAnnotationStatePayload,
  buildPrepPointerMessage,
  buildPdfFitToPageMessage,
  applyRemotePrepAnnotationState,
} from "./prepRealtimeSync";

export function savePrepAnnotations(opts, saveOpts, ctx) {
  const {
    storageKey,
    canvasRef,
    strokesRef,
    stickyNotesRef,
    textBoxesRef,
    masksRef,
    linesRef,
    boxesRef,
  } = ctx;

  savePrepAnnotationsToStorage({
    storageKey,
    canvasRef,
    opts,
    saveOpts,
    current: {
      strokes: strokesRef.current,
      stickyNotes: stickyNotesRef.current,
      textBoxes: textBoxesRef.current,
      masks: masksRef.current,
      lines: linesRef.current,
      boxes: boxesRef.current,
    },
  });
}

export function schedulePrepBroadcastAnnotations(partial, ctx) {
  const { pendingBroadcastRef, broadcastRafRef, broadcastAnnotations } = ctx;

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

export function schedulePrepSaveAnnotations(partial, ctx) {
  const { pendingSaveRef, saveDebounceRef, saveAnnotations } = ctx;

  pendingSaveRef.current = { ...pendingSaveRef.current, ...partial };

  if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
  saveDebounceRef.current = setTimeout(() => {
    const payload = pendingSaveRef.current;
    pendingSaveRef.current = {};
    saveAnnotations(payload, { includeCanvas: false });
  }, 300);
}

export function broadcastPrepAnnotations(custom, opts, ctx) {
  const {
    channelReady,
    sendOnChannel,
    applyingRemoteRef,
    resourceId,
    canvasRef,
    strokesRef,
    stickyNotesRef,
    textBoxesRef,
    masksRef,
    linesRef,
    boxesRef,
  } = ctx;

  if (!channelReady || !sendOnChannel) return;
  if (applyingRemoteRef.current) return;

  const payload = buildPrepAnnotationStatePayload({
    resourceId,
    custom,
    includeCanvas: !!opts?.includeCanvas,
    canvasRef,
    current: {
      strokes: strokesRef.current,
      stickyNotes: stickyNotesRef.current,
      textBoxes: textBoxesRef.current,
      masks: masksRef.current,
      lines: linesRef.current,
      boxes: boxesRef.current,
    },
  });

  try {
    sendOnChannel(payload);
  } catch (err) {
    console.warn("Failed to broadcast annotations", err);
  }
}

export function broadcastPrepPointer(normalizedPosOrNull, ctx) {
  const {
    channelReady,
    sendOnChannel,
    applyingRemoteRef,
    isPdf,
    pdfCurrentPage,
    isTeacher,
    resourceId,
    myUserId,
    user,
  } = ctx;

  if (!channelReady || !sendOnChannel) return;
  if (applyingRemoteRef.current) return;

  const page = isPdf ? pdfCurrentPage : 1;
  const message = buildPrepPointerMessage({
    normalizedPosOrNull,
    isTeacher,
    page,
    resourceId,
    myUserId,
    displayName: user?.firstName || user?.name || user?.email?.split("@")[0] || "User",
  });
  if (!message) return;
  sendOnChannel(message);
}

export function broadcastPrepPdfFitToPage(ctx) {
  const {
    channelReady,
    sendOnChannel,
    isTeacher,
    isPdf,
    applyingRemoteRef,
    resourceId,
    pdfCurrentPage,
  } = ctx;

  if (!channelReady || !sendOnChannel) return;
  if (!isTeacher) return;
  if (!isPdf) return;
  if (applyingRemoteRef.current) return;

  sendOnChannel(
    buildPdfFitToPageMessage({
      resourceId,
      page: pdfCurrentPage,
    })
  );
}

export function applyPrepRemoteAnnotations(message, ctx) {
  const {
    resourceId,
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
  } = ctx;

  applyRemotePrepAnnotationState(message, {
    resourceId,
    canvasRef,
    applyingRemoteRef,
    setStickyNotes,
    setTextBoxes,
    setMasks,
    setLines,
    setBoxes,
    setStrokes,
    scheduleSaveAnnotations,
    refs: {
      strokesRef,
      stickyNotesRef,
      textBoxesRef,
      masksRef,
      linesRef,
      boxesRef,
    },
  });
}
