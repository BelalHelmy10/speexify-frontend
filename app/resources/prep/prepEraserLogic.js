// app/resources/prep/prepEraserLogic.js

import {
  TOOL_PEN,
  TOOL_HIGHLIGHTER,
  HIT_RADIUS_STROKE,
  HIT_RADIUS_LINE,
  HIT_RADIUS_BOX_BORDER,
  HIT_RADIUS_STROKE_TOUCH,
  HIT_RADIUS_LINE_TOUCH,
  HIT_RADIUS_BOX_BORDER_TOUCH,
  pointToLineDistance,
  pointToRectBorderDistance,
} from "./prepAnnotationUtils";

export function findPrepItemAtPoint(p, ctx) {
  const {
    isPdf,
    pdfCurrentPage,
    lastInputWasTouch,
    strokes,
    lines,
    boxes,
    textBoxes,
    stickyNotes,
    masks,
    containerRef,
  } = ctx;

  const page = isPdf ? pdfCurrentPage : 1;
  const hitRadiusStroke = lastInputWasTouch
    ? HIT_RADIUS_STROKE_TOUCH
    : HIT_RADIUS_STROKE;
  const hitRadiusLine = lastInputWasTouch ? HIT_RADIUS_LINE_TOUCH : HIT_RADIUS_LINE;
  const hitRadiusBox = lastInputWasTouch
    ? HIT_RADIUS_BOX_BORDER_TOUCH
    : HIT_RADIUS_BOX_BORDER;

  let thinHit = { kind: null, id: null, dist: Infinity };

  for (const s of strokes) {
    if (isPdf && (s.page ?? 1) !== page) continue;
    if (!Array.isArray(s.points) || s.points.length === 0) continue;

    let minD2 = Infinity;
    if (s.points.length > 1) {
      for (const pt of s.points) {
        const dx = pt.x - p.x;
        const dy = pt.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < minD2) minD2 = d2;
      }
    } else {
      const dx = s.points[0].x - p.x;
      const dy = s.points[0].y - p.y;
      minD2 = dx * dx + dy * dy;
    }

    if (minD2 <= hitRadiusStroke * hitRadiusStroke) {
      const d = Math.sqrt(minD2);
      if (d < thinHit.dist) thinHit = { kind: "stroke", id: s.id, dist: d };
    }
  }

  for (const l of lines) {
    if (isPdf && (l.page ?? 1) !== page) continue;
    const d = pointToLineDistance(p.x, p.y, l.x1, l.y1, l.x2, l.y2);
    if (d <= hitRadiusLine && d < thinHit.dist) {
      thinHit = { kind: "line", id: l.id, dist: d };
    }
  }

  for (const b of boxes) {
    if (isPdf && (b.page ?? 1) !== page) continue;
    const d = pointToRectBorderDistance(p.x, p.y, b.x, b.y, b.width, b.height);
    if (d <= hitRadiusBox && d < thinHit.dist) {
      thinHit = { kind: "box", id: b.id, dist: d };
    }
  }

  if (thinHit.kind) {
    return { type: thinHit.kind, id: thinHit.id };
  }

  for (const t of textBoxes) {
    if (isPdf && (t.page ?? 1) !== page) continue;
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();
    const normWidth = t.width / (rect?.width || 1000);
    const halfW = normWidth / 2;
    const halfH = 0.03;

    if (
      p.x >= t.x - halfW &&
      p.x <= t.x + halfW &&
      p.y >= t.y - halfH &&
      p.y <= t.y + halfH
    ) {
      return { type: "text", id: t.id };
    }
  }

  for (const n of stickyNotes) {
    if (isPdf && (n.page ?? 1) !== page) continue;
    const noteW = 0.15;
    const noteH = 0.12;
    if (p.x >= n.x && p.x <= n.x + noteW && p.y >= n.y && p.y <= n.y + noteH) {
      return { type: "note", id: n.id };
    }
  }

  for (const m of masks) {
    if (isPdf && (m.page ?? 1) !== page) continue;
    if (p.x >= m.x && p.x <= m.x + m.width && p.y >= m.y && p.y <= m.y + m.height) {
      return { type: "mask", id: m.id };
    }
  }

  return null;
}

export function erasePrepAtPoint(e, ctx) {
  const {
    getNormalizedPoint,
    pushHistory,
    isPdf,
    pdfCurrentPage,
    lastInputWasTouch,
    strokes,
    lines,
    boxes,
    textBoxes,
    stickyNotes,
    masks,
    containerRef,
    scheduleSaveAnnotations,
    scheduleBroadcastAnnotations,
    setStrokes,
    setLines,
    setBoxes,
    setTextBoxes,
    setStickyNotes,
    setMasks,
    activeTextId,
    setActiveTextId,
    textAreaRefs,
  } = ctx;

  const p = getNormalizedPoint(e);
  if (!p) return;

  pushHistory();

  const page = isPdf ? pdfCurrentPage : 1;

  const hitRadiusStroke = lastInputWasTouch
    ? HIT_RADIUS_STROKE_TOUCH
    : HIT_RADIUS_STROKE;
  const hitRadiusLine = lastInputWasTouch ? HIT_RADIUS_LINE_TOUCH : HIT_RADIUS_LINE;
  const hitRadiusBox = lastInputWasTouch
    ? HIT_RADIUS_BOX_BORDER_TOUCH
    : HIT_RADIUS_BOX_BORDER;

  let thinHit = { kind: null, id: null, dist: Infinity };

  for (const s of strokes) {
    if (isPdf && (s.page ?? 1) !== page) continue;
    if (s.tool !== TOOL_PEN && s.tool !== TOOL_HIGHLIGHTER) continue;
    if (!Array.isArray(s.points) || s.points.length === 0) continue;

    let minD2 = Infinity;
    for (const pt of s.points) {
      const dx = pt.x - p.x;
      const dy = pt.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < minD2) minD2 = d2;
    }

    const hit = minD2 <= hitRadiusStroke * hitRadiusStroke;
    if (hit) {
      const d = Math.sqrt(minD2);
      if (d < thinHit.dist) thinHit = { kind: "stroke", id: s.id, dist: d };
    }
  }

  for (const l of lines) {
    if (isPdf && (l.page ?? 1) !== page) continue;
    const d = pointToLineDistance(p.x, p.y, l.x1, l.y1, l.x2, l.y2);
    if (d <= hitRadiusLine && d < thinHit.dist) {
      thinHit = { kind: "line", id: l.id, dist: d };
    }
  }

  for (const b of boxes) {
    if (isPdf && (b.page ?? 1) !== page) continue;
    const d = pointToRectBorderDistance(p.x, p.y, b.x, b.y, b.width, b.height);
    if (d <= hitRadiusBox && d < thinHit.dist) {
      thinHit = { kind: "box", id: b.id, dist: d };
    }
  }

  if (thinHit.kind && thinHit.id) {
    if (thinHit.kind === "stroke") {
      setStrokes((prev) => {
        const next = prev.filter((s) => s.id !== thinHit.id);
        scheduleSaveAnnotations({ strokes: next });
        scheduleBroadcastAnnotations({ strokes: next });
        return next;
      });
      return;
    }
    if (thinHit.kind === "line") {
      setLines((prev) => {
        const next = prev.filter((l) => l.id !== thinHit.id);
        scheduleSaveAnnotations({ lines: next });
        scheduleBroadcastAnnotations({ lines: next });
        return next;
      });
      return;
    }
    if (thinHit.kind === "box") {
      setBoxes((prev) => {
        const next = prev.filter((b) => b.id !== thinHit.id);
        scheduleSaveAnnotations({ boxes: next });
        scheduleBroadcastAnnotations({ boxes: next });
        return next;
      });
      return;
    }
  }

  let areaHit = { kind: null, id: null };

  for (const t of textBoxes) {
    if (isPdf && (t.page ?? 1) !== page) continue;
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();
    const normWidth = t.width / (rect?.width || 1000);
    const halfW = normWidth / 2;
    const halfH = 0.03;
    const inside =
      p.x >= t.x - halfW &&
      p.x <= t.x + halfW &&
      p.y >= t.y - halfH &&
      p.y <= t.y + halfH;

    if (inside) {
      areaHit = { kind: "text", id: t.id };
      break;
    }
  }

  if (!areaHit.kind) {
    for (const n of stickyNotes) {
      if (isPdf && (n.page ?? 1) !== page) continue;
      const noteW = 0.15;
      const noteH = 0.12;
      const inside =
        p.x >= n.x && p.x <= n.x + noteW && p.y >= n.y && p.y <= n.y + noteH;

      if (inside) {
        areaHit = { kind: "note", id: n.id };
        break;
      }
    }
  }

  if (!areaHit.kind) {
    for (const m of masks) {
      if (isPdf && (m.page ?? 1) !== page) continue;
      const inside =
        p.x >= m.x && p.x <= m.x + m.width && p.y >= m.y && p.y <= m.y + m.height;

      if (inside) {
        areaHit = { kind: "mask", id: m.id };
        break;
      }
    }
  }

  if (!areaHit.kind || !areaHit.id) return;

  if (areaHit.kind === "text") {
    setTextBoxes((prev) => {
      const next = prev.filter((t) => t.id !== areaHit.id);
      scheduleSaveAnnotations({ textBoxes: next });
      scheduleBroadcastAnnotations({ textBoxes: next });
      return next;
    });
    if (activeTextId === areaHit.id) setActiveTextId(null);
    if (textAreaRefs.current?.[areaHit.id]) delete textAreaRefs.current[areaHit.id];
    return;
  }

  if (areaHit.kind === "note") {
    setStickyNotes((prev) => {
      const next = prev.filter((n) => n.id !== areaHit.id);
      scheduleSaveAnnotations({ stickyNotes: next });
      scheduleBroadcastAnnotations({ stickyNotes: next });
      return next;
    });
    return;
  }

  if (areaHit.kind === "mask") {
    setMasks((prev) => {
      const next = prev.filter((m) => m.id !== areaHit.id);
      scheduleSaveAnnotations({ masks: next });
      scheduleBroadcastAnnotations({ masks: next });
      return next;
    });
  }
}
