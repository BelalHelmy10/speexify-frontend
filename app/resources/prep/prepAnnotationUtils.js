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
  if (!id) return 10;
  const match = id.match(/_(\d+)_/);
  if (!match) return 10;

  const timestamp = parseInt(match[1], 10);
  const orderValue = timestamp % 10000;
  return 10 + Math.floor((orderValue / 10000) * 39);
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
  { penColor }
) {
  strokesToDraw.forEach((stroke) => {
    if (!stroke.points || stroke.points.length < 2) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === TOOL_PEN) {
      ctx.strokeStyle = stroke.color || penColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    } else if (stroke.tool === TOOL_HIGHLIGHTER) {
      ctx.strokeStyle = "rgba(250, 224, 120, 0.3)";
      ctx.lineWidth = 12;
      ctx.globalAlpha = 0.3;
      ctx.globalCompositeOperation = "source-over";
    } else if (stroke.tool === TOOL_ERASER) {
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = 20;
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
  { isPdf, lines, boxes, textBoxes, pdfCurrentPage, penColor }
) {
  const visibleLines = isPdf
    ? lines.filter((l) => (l.page ?? 1) === pdfCurrentPage)
    : lines;
  visibleLines.forEach((l) => {
    ctx.beginPath();
    ctx.moveTo(l.x1 * width, l.y1 * height);
    ctx.lineTo(l.x2 * width, l.y2 * height);
    ctx.strokeStyle = l.color || penColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  const visibleBoxes = isPdf
    ? boxes.filter((b) => (b.page ?? 1) === pdfCurrentPage)
    : boxes;
  visibleBoxes.forEach((b) => {
    ctx.strokeStyle = b.color || penColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x * width, b.y * height, b.width * width, b.height * height);
  });

  const visibleText = isPdf
    ? textBoxes.filter((t) => (t.page ?? 1) === pdfCurrentPage)
    : textBoxes;
  visibleText.forEach((tb) => {
    ctx.fillStyle = tb.color || "black";
    ctx.font = `${tb.fontSize || 16}px sans-serif`;
    ctx.textBaseline = "top";
    const linesInBox = (tb.text || "").split("\n");
    linesInBox.forEach((line, i) => {
      ctx.fillText(
        line,
        tb.x * width - (tb.width * width) / 2,
        tb.y * height - (tb.height * height) / 2 + i * (tb.fontSize || 16) * 1.2
      );
    });
  });
}

export function exportAnnotationsAsPng({
  canvas,
  isPdf,
  pdfCurrentPage,
  strokes,
  lines,
  boxes,
  textBoxes,
  penColor,
}) {
  if (!canvas) return;

  const off = document.createElement("canvas");
  off.width = canvas.width;
  off.height = canvas.height;
  const ctx = off.getContext("2d");
  if (!ctx) return;

  const visibleStrokes = isPdf
    ? strokes.filter((s) => (s.page ?? 1) === pdfCurrentPage)
    : strokes;

  drawStrokesOnContext(ctx, visibleStrokes, off.width, off.height, { penColor });
  drawExtrasOnContext(ctx, off.width, off.height, {
    isPdf,
    lines,
    boxes,
    textBoxes,
    pdfCurrentPage,
    penColor,
  });

  const data = off.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = `speexify-export-${Date.now()}.png`;
  link.href = data;
  link.click();
  link.remove();
}
