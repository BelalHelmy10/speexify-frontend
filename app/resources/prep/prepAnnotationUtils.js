// app/resources/prep/prepAnnotationUtils.js

export const TOOL_NONE = "none";
export const TOOL_PEN = "pen";
export const TOOL_HIGHLIGHTER = "highlighter";
export const TOOL_NOTE = "note";
export const TOOL_POINTER = "pointer";
export const TOOL_ERASER = "eraser";
export const TOOL_TEXT = "text";
export const TOOL_MASK = "mask";
export const TOOL_LINE = "line";
export const TOOL_BOX = "box";
export const TOOL_SELECT = "select";

export const HIT_RADIUS_STROKE = 0.004;
export const HIT_RADIUS_LINE = 0.002;
export const HIT_RADIUS_BOX_BORDER = 0.002;

export const HIT_RADIUS_STROKE_TOUCH = 0.01;
export const HIT_RADIUS_LINE_TOUCH = 0.005;
export const HIT_RADIUS_BOX_BORDER_TOUCH = 0.005;

export const STROKE_WIDTH_OPTIONS = [1, 2, 3, 5, 8, 12];

export const PEN_COLORS = [
  "#000000",
  "#f9fafb",
  "#fbbf24",
  "#60a5fa",
  "#f97316",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#64748b",
  "#f59e0b",
];

export const POINTER_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#06b6d4",
  "#eab308",
];

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function smoothPathCatmullRom(points, tension = 0.5) {
  if (!points || points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  const pts = points;
  const n = pts.length;
  let path = `M ${pts[0].x},${pts[0].y}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[Math.min(n - 1, i + 1)];
    const p3 = pts[Math.min(n - 1, i + 2)];

    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 6;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 6;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 6;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 6;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return path;
}

export function simplifyPoints(points, epsilon = 0.001) {
  if (points.length < 3) return points;

  let maxDist = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyPoints(points.slice(maxIndex), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [start, end];
}

export function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) {
    return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  }

  const u = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (mag * mag);
  const closestX = lineStart.x + u * dx;
  const closestY = lineStart.y + u * dy;
  return Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
}

export function getTouchPoint(touchEvent) {
  if (!touchEvent.touches || touchEvent.touches.length === 0) return null;
  const touch = touchEvent.touches[0];
  return {
    clientX: touch.clientX,
    clientY: touch.clientY,
    target: touchEvent.target,
  };
}

export function getZIndexFromId(id) {
  const timestamp = getTimestampFromId(id);
  if (!timestamp) return 10000;

  return 10000 + (timestamp % 1000000000);
}

export function getTimestampFromId(id) {
  if (!id) return 0;
  const match = id.match(/_(\d+)_/);
  if (!match) return 0;
  return parseInt(match[1], 10);
}

export function isTextRTL(text) {
  if (!text || text.length === 0) return false;
  const trimmed = text.trimStart();
  if (!trimmed) return false;
  const rtlPattern = /^[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB00-\uFDFF\uFE70-\uFEFF\u0700-\u074F]/;
  return rtlPattern.test(trimmed);
}

export function colorForId(id) {
  const s = String(id || "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return POINTER_COLORS[hash % POINTER_COLORS.length];
}

export function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const len2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (len2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / len2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

export function pointToRectBorderDistance(px, py, rx, ry, rw, rh) {
  const right = rx + rw;
  const bottom = ry + rh;

  const distTop = pointToLineDistance(px, py, rx, ry, right, ry);
  const distBottom = pointToLineDistance(px, py, rx, bottom, right, bottom);
  const distLeft = pointToLineDistance(px, py, rx, ry, rx, bottom);
  const distRight = pointToLineDistance(px, py, right, ry, right, bottom);

  return Math.min(distTop, distBottom, distLeft, distRight);
}

export function getDetectedShape(points) {
  if (!points || points.length < 10) return null;

  const start = points[0];
  const end = points[points.length - 1];
  const dist = Math.hypot(start.x - end.x, start.y - end.y);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  const width = maxX - minX;
  const height = maxY - minY;
  if (width === 0 || height === 0) return null;
  const diag = Math.hypot(width, height);

  if (dist > diag * 0.25) return null;

  let totalDistToEdge = 0;
  points.forEach((p) => {
    const dx = Math.min(Math.abs(p.x - minX), Math.abs(p.x - maxX));
    const dy = Math.min(Math.abs(p.y - minY), Math.abs(p.y - maxY));
    totalDistToEdge += Math.min(dx, dy);
  });
  const avgDistToEdge = totalDistToEdge / points.length;

  if (avgDistToEdge < ((width + height) / 2) * 0.08) {
    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
      { x: minX, y: minY },
    ];
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = width / 2;
  const ry = height / 2;

  let errorSum = 0;
  points.forEach((p) => {
    const val = Math.pow((p.x - cx) / rx, 2) + Math.pow((p.y - cy) / ry, 2);
    errorSum += Math.abs(val - 1);
  });
  const avgError = errorSum / points.length;

  if (avgError < 0.2) {
    const newPoints = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * 2 * Math.PI;
      newPoints.push({
        x: cx + rx * Math.cos(theta),
        y: cy + ry * Math.sin(theta),
      });
    }
    return newPoints;
  }

  return null;
}

export function drawStrokesOnContext(
  ctx,
  strokesToDraw,
  width,
  height,
  { penColor, strokeScale = 1 }
) {
  strokesToDraw.forEach((stroke) => {
    if (!stroke.points || stroke.points.length < 2) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === TOOL_PEN) {
      ctx.strokeStyle = stroke.color || penColor;
      ctx.lineWidth = (stroke.strokeWidth || 3) * strokeScale;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    } else if (stroke.tool === TOOL_HIGHLIGHTER) {
      ctx.strokeStyle = "#FFEB3B";
      ctx.lineWidth = (stroke.strokeWidth || 12) * strokeScale;
      ctx.globalAlpha = 0.55;
      ctx.globalCompositeOperation = "source-over";
    } else if (stroke.tool === TOOL_ERASER) {
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = 20 * strokeScale;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "destination-out";
    }

    ctx.beginPath();
    stroke.points.forEach((p, idx) => {
      const x = p.x * width;
      const y = p.y * height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
    ctx.restore();
  });
}

export function drawExtrasOnContext(
  ctx,
  width,
  height,
  { isPdf, lines, boxes, textBoxes, pdfCurrentPage, penColor, exportScale = 1 }
) {
  const visibleLines = isPdf
    ? lines.filter((l) => (l.page ?? 1) === pdfCurrentPage)
    : lines;
  visibleLines.forEach((l) => {
    drawLineOnContext(ctx, l, width, height, penColor, exportScale);
  });

  const visibleBoxes = isPdf
    ? boxes.filter((b) => (b.page ?? 1) === pdfCurrentPage)
    : boxes;
  visibleBoxes.forEach((b) => {
    drawBoxOnContext(ctx, b, width, height, penColor, exportScale);
  });

  const visibleText = isPdf
    ? textBoxes.filter((t) => (t.page ?? 1) === pdfCurrentPage)
    : textBoxes;
  visibleText.forEach((tb) => {
    drawTextBoxOnContext(ctx, tb, width, height, exportScale);
  });
}

function drawLineOnContext(ctx, line, width, height, penColor, exportScale = 1) {
  ctx.beginPath();
  ctx.moveTo(line.x1 * width, line.y1 * height);
  ctx.lineTo(line.x2 * width, line.y2 * height);
  ctx.strokeStyle = line.color || penColor;
  ctx.lineWidth = 2 * exportScale;
  ctx.stroke();
}

function drawBoxOnContext(ctx, box, width, height, penColor, exportScale = 1) {
  ctx.strokeStyle = box.color || penColor;
  ctx.lineWidth = 2 * exportScale;
  ctx.strokeRect(box.x * width, box.y * height, box.width * width, box.height * height);
}

function sanitizeExportName(name) {
  return String(name || "speexify-export")
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "speexify-export";
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create export blob"));
      },
      type,
      quality
    );
  });
}

function concatUint8Arrays(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

function makePdfObject(id, body) {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

async function createPdfBlobFromCanvas(canvas) {
  const encoder = new TextEncoder();
  const jpegBlob = await canvasToBlob(canvas, "image/jpeg", 0.94);
  const imageBytes = new Uint8Array(await jpegBlob.arrayBuffer());
  const pageWidth = Math.round(canvas.width);
  const pageHeight = Math.round(canvas.height);
  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ`;

  const objects = [
    encoder.encode(makePdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>")),
    encoder.encode(makePdfObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>")),
    encoder.encode(
      makePdfObject(
        3,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
      )
    ),
    concatUint8Arrays([
      encoder.encode(
        `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pageWidth} /Height ${pageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`
      ),
      imageBytes,
      encoder.encode("\nendstream\nendobj\n"),
    ]),
    encoder.encode(
      makePdfObject(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
    ),
  ];

  const header = encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const offsets = [0];
  let cursor = header.length;
  objects.forEach((obj) => {
    offsets.push(cursor);
    cursor += obj.length;
  });

  const xrefStart = cursor;
  const xrefRows = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f "];
  for (let i = 1; i <= objects.length; i += 1) {
    xrefRows.push(`${String(offsets[i]).padStart(10, "0")} 00000 n `);
  }
  const trailer = [
    ...xrefRows,
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefStart),
    "%%EOF",
  ].join("\n");

  return new Blob([header, ...objects, encoder.encode(trailer)], {
    type: "application/pdf",
  });
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
  const preserveBreaks = options.preserveBreaks ?? true;
  const paragraphs = preserveBreaks ? String(text || "").split(/\r\n|\r|\n/) : [String(text || "")];
  let cursorY = y;

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.split(/(\s+)/).filter(Boolean);
    let line = "";

    if (!words.length) {
      cursorY += lineHeight;
      return;
    }

    words.forEach((word) => {
      const test = `${line}${word}`;
      if (line && ctx.measureText(test).width > maxWidth) {
        ctx.fillText(line.trimEnd(), x, cursorY);
        line = word.trimStart();
        cursorY += lineHeight;
      } else {
        line = test;
      }
    });

    if (line) {
      ctx.fillText(line.trimEnd(), x, cursorY);
      cursorY += lineHeight;
    }

    if (paragraphIndex < paragraphs.length - 1) {
      cursorY += lineHeight * 0.15;
    }
  });

  return cursorY;
}

function drawTextBoxOnContext(ctx, tb, width, height, exportScale = 1) {
  const fontSize = (tb.fontSize || 16) * exportScale;
  const boxWidth = (tb.width || 150) * exportScale;
  const boxHeight = tb.height ? tb.height * exportScale : null;
  const x = tb.x * width - boxWidth / 2;
  const y = tb.y * height - (boxHeight || fontSize * 1.2) / 2;
  const text = tb.text || "";
  const hasManualLineBreaks = /[\r\n]/.test(text);
  const shouldWrap = hasManualLineBreaks || !tb.autoWidth;

  ctx.save();
  if (boxHeight) {
    ctx.beginPath();
    ctx.rect(x, y, boxWidth, boxHeight);
    ctx.clip();
  }
  ctx.fillStyle = tb.color || "black";
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textBaseline = "top";
  if (shouldWrap) {
    drawWrappedText(ctx, text, x, y, boxWidth, fontSize * 1.2);
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

function drawMasksOnContext(ctx, masks, width, height, { isPdf, pdfCurrentPage, exportScale }) {
  const visibleMasks = isPdf
    ? masks.filter((mask) => (mask.page ?? 1) === pdfCurrentPage)
    : masks;

  visibleMasks.forEach((mask) => {
    drawMaskOnContext(ctx, mask, width, height, exportScale);
  });
}

function drawMaskOnContext(ctx, mask, width, height, exportScale = 1) {
  const x = mask.x * width;
  const y = mask.y * height;
  const w = mask.width * width;
  const h = mask.height * height;
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(15, 23, 42, 0.18)";
  ctx.lineWidth = Math.max(1, exportScale);
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawStickyNotesOnContext(ctx, stickyNotes, width, height, {
  isPdf,
  pdfCurrentPage,
  exportScale,
}) {
  const visibleNotes = isPdf
    ? stickyNotes.filter((note) => (note.page ?? 1) === pdfCurrentPage)
    : stickyNotes;

  visibleNotes.forEach((note) => {
    drawStickyNoteOnContext(ctx, note, width, height, exportScale);
  });
}

function drawStickyNoteOnContext(ctx, note, width, height, exportScale = 1) {
  const noteWidth = 220 * exportScale;
  const headerHeight = 26 * exportScale;
  const paddingX = 12 * exportScale;
  const paddingY = 10 * exportScale;
  const fontSize = 14 * exportScale;
  const lineHeight = fontSize * 1.28;
  const text = note.text || "";
  const linesEstimate = Math.max(3, Math.ceil(text.length / 24));
  const noteHeight = Math.max(
    108 * exportScale,
    headerHeight + paddingY * 2 + linesEstimate * lineHeight
  );
  const x = note.x * width - noteWidth / 2;
  const y = note.y * height - noteHeight / 2;
  const radius = 8 * exportScale;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
  ctx.shadowBlur = 10 * exportScale;
  ctx.shadowOffsetY = 4 * exportScale;
  ctx.fillStyle = "#fef08a";
  roundRect(ctx, x, y, noteWidth, noteHeight, radius);
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.fillStyle = "rgba(15, 23, 42, 0.08)";
  roundRect(ctx, x, y, noteWidth, headerHeight, radius);
  ctx.fill();

  ctx.fillStyle = "#1f2937";
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textBaseline = "top";
  drawWrappedText(
    ctx,
    text,
    x + paddingX,
    y + headerHeight + paddingY,
    noteWidth - paddingX * 2,
    lineHeight
  );
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function isVisibleOnPage(item, isPdf, pdfCurrentPage) {
  return !isPdf || (item.page ?? 1) === pdfCurrentPage;
}

function drawStackedPageAnnotations(ctx, width, height, {
  isPdf,
  pdfCurrentPage,
  strokes,
  lines,
  boxes,
  textBoxes,
  stickyNotes,
  masks,
  penColor,
  exportScale,
}) {
  const layeredItems = [
    ...strokes
      .filter((item) => isVisibleOnPage(item, isPdf, pdfCurrentPage))
      .map((item) => ({ type: "stroke", item })),
    ...lines
      .filter((item) => isVisibleOnPage(item, isPdf, pdfCurrentPage))
      .map((item) => ({ type: "line", item })),
    ...boxes
      .filter((item) => isVisibleOnPage(item, isPdf, pdfCurrentPage))
      .map((item) => ({ type: "box", item })),
    ...textBoxes
      .filter((item) => isVisibleOnPage(item, isPdf, pdfCurrentPage))
      .map((item) => ({ type: "text", item })),
    ...stickyNotes
      .filter((item) => isVisibleOnPage(item, isPdf, pdfCurrentPage))
      .map((item) => ({ type: "note", item })),
    ...masks
      .filter((item) => isVisibleOnPage(item, isPdf, pdfCurrentPage))
      .map((item) => ({ type: "mask", item })),
  ].sort((a, b) => getTimestampFromId(a.item.id) - getTimestampFromId(b.item.id));

  layeredItems.forEach(({ type, item }) => {
    if (type === "stroke") {
      drawStrokesOnContext(ctx, [item], width, height, {
        penColor,
        strokeScale: exportScale,
      });
    } else if (type === "line") {
      drawLineOnContext(ctx, item, width, height, penColor, exportScale);
    } else if (type === "box") {
      drawBoxOnContext(ctx, item, width, height, penColor, exportScale);
    } else if (type === "text") {
      drawTextBoxOnContext(ctx, item, width, height, exportScale);
    } else if (type === "note") {
      drawStickyNoteOnContext(ctx, item, width, height, exportScale);
    } else if (type === "mask") {
      drawMaskOnContext(ctx, item, width, height, exportScale);
    }
  });
}

function composeAnnotatedPageCanvas({
  container,
  canvas,
  isPdf,
  pdfCurrentPage,
  strokes,
  lines,
  boxes,
  textBoxes,
  stickyNotes = [],
  masks = [],
  penColor,
}) {
  const pdfCanvas = isPdf
    ? container?.querySelector?.(".cpv-page-canvas")
    : null;
  const baseEl = pdfCanvas || container || canvas;
  if (!baseEl) throw new Error("Nothing is available to export.");

  const rect = baseEl.getBoundingClientRect?.();
  const cssWidth = Math.max(
    1,
    Math.round(baseEl.clientWidth || rect?.width || canvas?.width || 1)
  );
  const cssHeight = Math.max(
    1,
    Math.round(baseEl.clientHeight || rect?.height || canvas?.height || 1)
  );
  const exportScale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

  const out = document.createElement("canvas");
  out.width = Math.round(cssWidth * exportScale);
  out.height = Math.round(cssHeight * exportScale);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Could not prepare export canvas.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);

  if (pdfCanvas) {
    ctx.drawImage(pdfCanvas, 0, 0, out.width, out.height);
  }

  drawStackedPageAnnotations(ctx, out.width, out.height, {
    isPdf,
    pdfCurrentPage,
    strokes,
    lines,
    boxes,
    textBoxes,
    stickyNotes,
    masks,
    penColor,
    exportScale,
  });

  return out;
}

export async function exportAnnotatedPage({
  format = "png",
  container,
  canvas,
  isPdf,
  pdfCurrentPage,
  strokes,
  lines,
  boxes,
  textBoxes,
  stickyNotes,
  masks,
  penColor,
  fileBaseName,
}) {
  const out = composeAnnotatedPageCanvas({
    container,
    canvas,
    isPdf,
    pdfCurrentPage,
    strokes,
    lines,
    boxes,
    textBoxes,
    stickyNotes,
    masks,
    penColor,
  });

  const suffix = isPdf ? `page-${pdfCurrentPage}` : "annotations";
  const baseName = `${sanitizeExportName(fileBaseName)}-${suffix}`;

  if (format === "pdf") {
    const pdfBlob = await createPdfBlobFromCanvas(out);
    downloadBlob(pdfBlob, `${baseName}.pdf`);
    return;
  }

  const pngBlob = await canvasToBlob(out, "image/png");
  downloadBlob(pngBlob, `${baseName}.png`);
}

export function exportAnnotationsAsPng({
  canvas,
  isPdf,
  pdfCurrentPage,
  strokes,
  lines,
  boxes,
  textBoxes,
  stickyNotes,
  masks,
  penColor,
}) {
  return exportAnnotatedPage({
    format: "png",
    canvas,
    container: canvas?.parentElement || null,
    isPdf,
    pdfCurrentPage,
    strokes,
    lines,
    boxes,
    textBoxes,
    stickyNotes,
    masks,
    penColor,
  });
}
