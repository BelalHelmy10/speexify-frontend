// app/resources/prep/prepNoteLogic.js

import { TOOL_NOTE, TOOL_SELECT } from "./prepAnnotationUtils";

export function createPrepStickyNote(e, ctx) {
  const {
    tool,
    getCanvasCoordinates,
    isPdf,
    pdfCurrentPage,
    pushHistory,
    stickyNotes,
    setStickyNotes,
    scheduleSaveAnnotations,
    scheduleBroadcastAnnotations,
  } = ctx;

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

  pushHistory();

  const nextNotes = [...stickyNotes, note];
  setStickyNotes(nextNotes);
  scheduleSaveAnnotations({ stickyNotes: nextNotes });
  scheduleBroadcastAnnotations({ stickyNotes: nextNotes });
}

export function updatePrepStickyNoteText(id, text, ctx) {
  const { stickyNotes, setStickyNotes, scheduleSaveAnnotations, scheduleBroadcastAnnotations } = ctx;

  const next = stickyNotes.map((n) => (n.id === id ? { ...n, text } : n));
  setStickyNotes(next);
  scheduleSaveAnnotations({ stickyNotes: next });
  scheduleBroadcastAnnotations({ stickyNotes: next });
}

export function deletePrepStickyNote(id, ctx) {
  const { stickyNotes, setStickyNotes, saveAnnotations, broadcastAnnotations } = ctx;

  const next = stickyNotes.filter((n) => n.id !== id);
  setStickyNotes(next);
  saveAnnotations({ stickyNotes: next });
  broadcastAnnotations({ stickyNotes: next });
}

export function startPrepNoteDrag(e, note, ctx) {
  const { tool, getCanvasCoordinates, setDragState } = ctx;

  if (tool === TOOL_SELECT) return;

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
