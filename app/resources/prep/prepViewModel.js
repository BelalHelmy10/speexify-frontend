// app/resources/prep/prepViewModel.js

import {
  TOOL_PEN,
  TOOL_HIGHLIGHTER,
  TOOL_NOTE,
  TOOL_POINTER,
  TOOL_ERASER,
  TOOL_TEXT,
  TOOL_MASK,
  TOOL_LINE,
  TOOL_BOX,
} from "./prepAnnotationUtils";

export function buildPrepAudioTracks(resource) {
  const audioTracks = [];

  if (Array.isArray(resource?.audioTracks)) {
    resource.audioTracks.forEach((track, index) => {
      if (!track) return;

      const url =
        track.fileUrl ||
        track.url ||
        (track.file && track.file.asset && track.file.asset.url);

      if (!url) return;

      audioTracks.push({
        id: track._key || `track_${index}`,
        label: track.label || `Track ${index + 1}`,
        url,
      });
    });
  }

  if (resource?.audioUrl) {
    audioTracks.unshift({
      id: "main-audio",
      label: "Main audio",
      url: resource.audioUrl,
    });
  }

  return audioTracks;
}

export function getPrepCurrentToolIcon(tool) {
  if (tool === TOOL_PEN) return "🖊️";
  if (tool === TOOL_HIGHLIGHTER) return "✨";
  if (tool === TOOL_MASK) return "⬜";
  if (tool === TOOL_TEXT) return "✍️";
  if (tool === TOOL_LINE) return "📏";
  if (tool === TOOL_BOX) return "🟥";
  if (tool === TOOL_ERASER) return "🧽";
  if (tool === TOOL_NOTE) return "🗒️";
  if (tool === TOOL_POINTER) return "➤";
  return "🛠️";
}

export function getPrepCurrentToolLabel(tool, labels) {
  if (tool === TOOL_PEN) return labels.pen;
  if (tool === TOOL_HIGHLIGHTER) return labels.highlighter;
  if (tool === TOOL_MASK) return "Hide area";
  if (tool === TOOL_TEXT) return labels.text;
  if (tool === TOOL_LINE) return "Straight Line";
  if (tool === TOOL_BOX) return "Border Box";
  if (tool === TOOL_ERASER) return labels.eraser;
  if (tool === TOOL_NOTE) return labels.note;
  if (tool === TOOL_POINTER) return labels.pointer;
  return labels.pen;
}
