// app/resources/prep/prepRealtimeSync.js

export function savePrepAnnotationsToStorage({
  storageKey,
  canvasRef,
  opts = {},
  saveOpts = { includeCanvas: false },
  current,
}) {
  if (!storageKey) return;

  try {
    let canvasData;
    if (saveOpts?.includeCanvas) {
      const canvas = canvasRef?.current;
      canvasData = opts.canvasData ?? (canvas ? canvas.toDataURL("image/png") : undefined);
    }

    const data = {
      canvasData: (saveOpts?.includeCanvas ? canvasData : undefined) || null,
      strokes: opts.strokes ?? current.strokes,
      stickyNotes: opts.stickyNotes ?? current.stickyNotes,
      textBoxes: opts.textBoxes ?? current.textBoxes,
      masks: opts.masks ?? current.masks,
      lines: opts.lines ?? current.lines,
      boxes: opts.boxes ?? current.boxes,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save annotations", err);
  }
}

export function buildPrepAnnotationStatePayload({
  resourceId,
  custom = {},
  includeCanvas = false,
  canvasRef,
  current,
}) {
  let canvasData = null;
  if (includeCanvas) {
    const canvas = canvasRef?.current;
    canvasData = custom.canvasData ?? (canvas ? canvas.toDataURL("image/png") : null);
  }

  return {
    type: "ANNOTATION_STATE",
    resourceId,
    canvasData: canvasData || null,
    strokes: custom.strokes ?? current.strokes,
    stickyNotes: custom.stickyNotes ?? current.stickyNotes,
    textBoxes: custom.textBoxes ?? current.textBoxes,
    masks: custom.masks ?? current.masks,
    lines: custom.lines ?? current.lines,
    boxes: custom.boxes ?? current.boxes,
  };
}

export function buildPrepPointerMessage({
  normalizedPosOrNull,
  isTeacher,
  page,
  resourceId,
  myUserId,
  displayName,
}) {
  if (isTeacher) {
    if (!normalizedPosOrNull) {
      return {
        type: "TEACHER_POINTER_HIDE",
        resourceId,
        page,
      };
    }

    return {
      type: "TEACHER_POINTER_MOVE",
      resourceId,
      page,
      xNorm: normalizedPosOrNull.x,
      yNorm: normalizedPosOrNull.y,
    };
  }

  if (!myUserId) return null;

  if (!normalizedPosOrNull) {
    return {
      type: "LEARNER_POINTER_HIDE",
      resourceId,
      page,
      userId: myUserId,
    };
  }

  return {
    type: "LEARNER_POINTER_MOVE",
    resourceId,
    page,
    userId: myUserId,
    displayName,
    xNorm: normalizedPosOrNull.x,
    yNorm: normalizedPosOrNull.y,
  };
}

export function buildPdfFitToPageMessage({ resourceId, page }) {
  return {
    type: "PDF_FIT_TO_PAGE",
    resourceId,
    page,
    at: Date.now(),
  };
}

export function applyRemotePrepAnnotationState(message, ctx) {
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
    refs,
  } = ctx;

  if (!message || message.resourceId !== resourceId) return;

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
      const drawContext = canvas.getContext("2d");
      if (drawContext) {
        drawContext.clearRect(0, 0, canvas.width, canvas.height);
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
      strokes: Array.isArray(remoteStrokes) ? remoteStrokes : refs.strokesRef.current,
      stickyNotes: Array.isArray(remoteNotes) ? remoteNotes : refs.stickyNotesRef.current,
      textBoxes: Array.isArray(remoteText) ? remoteText : refs.textBoxesRef.current,
      masks: Array.isArray(remoteMasks) ? remoteMasks : refs.masksRef.current,
      lines: Array.isArray(remoteLines) ? remoteLines : refs.linesRef.current,
      boxes: Array.isArray(remoteBoxes) ? remoteBoxes : refs.boxesRef.current,
    });
  } finally {
    applyingRemoteRef.current = false;
  }
}

export function handlePrepChannelMessage(msg, ctx) {
  const {
    resourceId,
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
  } = ctx;

  if (!msg || msg.resourceId !== resourceId) return;

  if (msg.type === "ANNOTATION_STATE") {
    applyRemoteAnnotationState(msg);
    return;
  }

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
    const displayName = msg.displayName || "User";

    setLearnerPointersByPage((prev) => ({
      ...prev,
      [page]: {
        ...(prev[page] || {}),
        [uid]: { x: msg.xNorm, y: msg.yNorm, displayName },
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

  if (msg.type === "PDF_SET_PAGE" && !isTeacher && isPdf) {
    const page = Number(msg.page) || 1;
    const api = pdfNavApiRef.current;
    if (api?.setPage) api.setPage(page);
    return;
  }

  if (msg.type === "PDF_SCROLL" && !isTeacher && isPdf) {
    const api = pdfNavApiRef.current;
    const targetPage = Number(msg.page) || 1;

    if (api?.setPage && targetPage !== pdfCurrentPage) {
      api.setPage(targetPage);
    }

    setTimeout(() => {
      const el = pdfScrollRef.current;
      if (!el) return;

      const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
      const norm = Math.min(1, Math.max(0, Number(msg.scrollNorm) || 0));
      el.scrollTop = norm * maxScroll;
    }, 0);

    return;
  }

  if (msg.type === "PDF_FIT_TO_PAGE" && !isTeacher && isPdf) {
    const api = pdfNavApiRef.current;

    const targetPage = Number(msg.page) || pdfCurrentPage;
    if (api?.setPage && targetPage !== pdfCurrentPage) {
      api.setPage(targetPage);
    }

    setTimeout(() => {
      const a = pdfNavApiRef.current;
      if (a?.fitToPage) a.fitToPage();
    }, 0);

    return;
  }

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
    } catch (_) {
      // no-op
    }
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
  }
}
