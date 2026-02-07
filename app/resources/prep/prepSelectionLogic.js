// app/resources/prep/prepSelectionLogic.js

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildInitialItemsMap(itemsToDrag, collections) {
  const { strokes, stickyNotes, textBoxes, masks, lines, boxes } = collections;
  const initialItems = new Map();

  itemsToDrag.forEach((item) => {
    let data;
    if (item.type === "stroke") data = strokes.find((i) => i.id === item.id);
    else if (item.type === "note") data = stickyNotes.find((i) => i.id === item.id);
    else if (item.type === "text") data = textBoxes.find((i) => i.id === item.id);
    else if (item.type === "mask") data = masks.find((i) => i.id === item.id);
    else if (item.type === "line") data = lines.find((i) => i.id === item.id);
    else if (item.type === "box") data = boxes.find((i) => i.id === item.id);

    if (data) {
      initialItems.set(item.id, { type: item.type, data: deepClone(data) });
    }
  });

  return initialItems;
}

export function handlePrepSelectionPointerDown(p, ctx) {
  const {
    findItemAtPoint,
    selectedItems,
    setSelectedItems,
    setSelectionBox,
    setGroupDrag,
    collections,
  } = ctx;

  const hitItem = findItemAtPoint(p);
  let itemsToDrag = selectedItems;

  if (hitItem) {
    const isAlreadySelected = selectedItems.some(
      (i) => i.type === hitItem.type && i.id === hitItem.id
    );

    if (!isAlreadySelected) {
      itemsToDrag = [hitItem];
      setSelectedItems([hitItem]);
    }

    const initialItems = buildInitialItemsMap(itemsToDrag, collections);
    setGroupDrag({ startX: p.x, startY: p.y, initialItems });
    return;
  }

  setSelectedItems([]);
  setSelectionBox({
    startX: p.x,
    startY: p.y,
    currentX: p.x,
    currentY: p.y,
  });
}

export function handlePrepGroupDragMove(p, ctx) {
  const {
    groupDrag,
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
  } = ctx;

  if (!groupDrag) return;

  const dx = p.x - groupDrag.startX;
  const dy = p.y - groupDrag.startY;

  const nextStrokes = [...strokes];
  let strokesChanged = false;
  const nextNotes = [...stickyNotes];
  let notesChanged = false;
  const nextTexts = [...textBoxes];
  let textsChanged = false;
  const nextMasks = [...masks];
  let masksChanged = false;
  const nextLines = [...lines];
  let linesChanged = false;
  const nextBoxes = [...boxes];
  let boxesChanged = false;

  groupDrag.initialItems.forEach((info, id) => {
    const { type, data } = info;
    if (type === "stroke") {
      const sIndex = nextStrokes.findIndex((s) => s.id === id);
      if (sIndex !== -1) {
        const newPoints = data.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
        nextStrokes[sIndex] = { ...nextStrokes[sIndex], points: newPoints };
        strokesChanged = true;
      }
    } else if (type === "note") {
      const nIndex = nextNotes.findIndex((n) => n.id === id);
      if (nIndex !== -1) {
        nextNotes[nIndex] = { ...nextNotes[nIndex], x: data.x + dx, y: data.y + dy };
        notesChanged = true;
      }
    } else if (type === "text") {
      const tIndex = nextTexts.findIndex((t) => t.id === id);
      if (tIndex !== -1) {
        nextTexts[tIndex] = { ...nextTexts[tIndex], x: data.x + dx, y: data.y + dy };
        textsChanged = true;
      }
    } else if (type === "mask") {
      const mIndex = nextMasks.findIndex((m) => m.id === id);
      if (mIndex !== -1) {
        nextMasks[mIndex] = { ...nextMasks[mIndex], x: data.x + dx, y: data.y + dy };
        masksChanged = true;
      }
    } else if (type === "line") {
      const lIndex = nextLines.findIndex((l) => l.id === id);
      if (lIndex !== -1) {
        nextLines[lIndex] = {
          ...nextLines[lIndex],
          x1: data.x1 + dx,
          y1: data.y1 + dy,
          x2: data.x2 + dx,
          y2: data.y2 + dy,
        };
        linesChanged = true;
      }
    } else if (type === "box") {
      const bIndex = nextBoxes.findIndex((b) => b.id === id);
      if (bIndex !== -1) {
        nextBoxes[bIndex] = { ...nextBoxes[bIndex], x: data.x + dx, y: data.y + dy };
        boxesChanged = true;
      }
    }
  });

  if (strokesChanged) setStrokes(nextStrokes);
  if (notesChanged) setStickyNotes(nextNotes);
  if (textsChanged) setTextBoxes(nextTexts);
  if (masksChanged) setMasks(nextMasks);
  if (linesChanged) setLines(nextLines);
  if (boxesChanged) setBoxes(nextBoxes);
}

export function handlePrepSelectionBoxMove(p, setSelectionBox) {
  setSelectionBox((prev) => ({
    ...prev,
    currentX: p.x,
    currentY: p.y,
  }));
}

export function finalizePrepGroupDrag(ctx) {
  const {
    groupDrag,
    setGroupDrag,
    strokes,
    stickyNotes,
    textBoxes,
    masks,
    lines,
    boxes,
    scheduleSaveAnnotations,
    scheduleBroadcastAnnotations,
  } = ctx;

  if (!groupDrag) return;

  setGroupDrag(null);

  const updates = {};
  let hasUpdates = false;

  groupDrag.initialItems.forEach((info) => {
    if (info.type === "stroke") {
      updates.strokes = strokes;
      hasUpdates = true;
    } else if (info.type === "note") {
      updates.stickyNotes = stickyNotes;
      hasUpdates = true;
    } else if (info.type === "text") {
      updates.textBoxes = textBoxes;
      hasUpdates = true;
    } else if (info.type === "mask") {
      updates.masks = masks;
      hasUpdates = true;
    } else if (info.type === "line") {
      updates.lines = lines;
      hasUpdates = true;
    } else if (info.type === "box") {
      updates.boxes = boxes;
      hasUpdates = true;
    }
  });

  if (hasUpdates) {
    scheduleSaveAnnotations(updates);
    scheduleBroadcastAnnotations(updates);
  }
}

export function finalizePrepSelectionBox(ctx) {
  const {
    selectionBox,
    isPdf,
    pdfCurrentPage,
    strokes,
    stickyNotes,
    textBoxes,
    masks,
    lines,
    boxes,
    containerWidth,
    setSelectedItems,
    setSelectionBox,
  } = ctx;

  if (!selectionBox) return;

  const sb = selectionBox;
  const x1 = Math.min(sb.startX, sb.currentX);
  const y1 = Math.min(sb.startY, sb.currentY);
  const x2 = Math.max(sb.startX, sb.currentX);
  const y2 = Math.max(sb.startY, sb.currentY);

  const selected = [];
  const page = isPdf ? pdfCurrentPage : 1;

  strokes.forEach((s) => {
    if (isPdf && (s.page ?? 1) !== page) return;
    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;
    if (!s.points || s.points.length === 0) return;

    s.points.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    if (minX <= x2 && maxX >= x1 && minY <= y2 && maxY >= y1) {
      selected.push({ type: "stroke", id: s.id });
    }
  });

  stickyNotes.forEach((n) => {
    if (isPdf && (n.page ?? 1) !== page) return;
    const nw = 0.15;
    const nh = 0.12;
    if (n.x <= x2 && n.x + nw >= x1 && n.y <= y2 && n.y + nh >= y1) {
      selected.push({ type: "note", id: n.id });
    }
  });

  textBoxes.forEach((t) => {
    if (isPdf && (t.page ?? 1) !== page) return;
    const nw = t.width / containerWidth;
    const nh = 0.05;
    if (t.x <= x2 && t.x + nw >= x1 && t.y <= y2 && t.y + nh >= y1) {
      selected.push({ type: "text", id: t.id });
    }
  });

  masks.forEach((m) => {
    if (isPdf && (m.page ?? 1) !== page) return;
    if (m.x <= x2 && m.x + m.width >= x1 && m.y <= y2 && m.y + m.height >= y1) {
      selected.push({ type: "mask", id: m.id });
    }
  });

  lines.forEach((l) => {
    if (isPdf && (l.page ?? 1) !== page) return;
    const lx1 = Math.min(l.x1, l.x2);
    const ly1 = Math.min(l.y1, l.y2);
    const lx2 = Math.max(l.x1, l.x2);
    const ly2 = Math.max(l.y1, l.y2);
    if (lx1 <= x2 && lx2 >= x1 && ly1 <= y2 && ly2 >= y1) {
      selected.push({ type: "line", id: l.id });
    }
  });

  boxes.forEach((b) => {
    if (isPdf && (b.page ?? 1) !== page) return;
    const bx1 = Math.min(b.x, b.x + b.width);
    const by1 = Math.min(b.y, b.y + b.height);
    const bx2 = Math.max(b.x, b.x + b.width);
    const by2 = Math.max(b.y, b.y + b.height);
    if (bx1 <= x2 && bx2 >= x1 && by1 <= y2 && by2 >= y1) {
      selected.push({ type: "box", id: b.id });
    }
  });

  setSelectedItems(selected);
  setSelectionBox(null);
}

export function deleteSelectedPrepItems(ctx) {
  const {
    selectedItems,
    pushHistory,
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
    scheduleSaveAnnotations,
    scheduleBroadcastAnnotations,
    setSelectedItems,
    setSelectionBox,
  } = ctx;

  if (selectedItems.length === 0) return;

  pushHistory();

  const selectedIds = new Set(selectedItems.map((i) => i.id));
  let hasChanges = false;
  let strokesChanged = false;
  let notesChanged = false;
  let textChanged = false;
  let masksChanged = false;
  let linesChanged = false;
  let boxesChanged = false;

  const newStrokes = strokes.filter((s) => {
    if (selectedIds.has(s.id)) {
      strokesChanged = true;
      hasChanges = true;
      return false;
    }
    return true;
  });

  const newNotes = stickyNotes.filter((n) => {
    if (selectedIds.has(n.id)) {
      notesChanged = true;
      hasChanges = true;
      return false;
    }
    return true;
  });

  const newtexts = textBoxes.filter((t) => {
    if (selectedIds.has(t.id)) {
      textChanged = true;
      hasChanges = true;
      return false;
    }
    return true;
  });

  const newMasks = masks.filter((m) => {
    if (selectedIds.has(m.id)) {
      masksChanged = true;
      hasChanges = true;
      return false;
    }
    return true;
  });

  const newLines = lines.filter((l) => {
    if (selectedIds.has(l.id)) {
      linesChanged = true;
      hasChanges = true;
      return false;
    }
    return true;
  });

  const newBoxes = boxes.filter((b) => {
    if (selectedIds.has(b.id)) {
      boxesChanged = true;
      hasChanges = true;
      return false;
    }
    return true;
  });

  if (hasChanges) {
    if (strokesChanged) {
      setStrokes(newStrokes);
      scheduleSaveAnnotations({ strokes: newStrokes });
      scheduleBroadcastAnnotations({ strokes: newStrokes });
    }
    if (notesChanged) {
      setStickyNotes(newNotes);
      scheduleSaveAnnotations({ stickyNotes: newNotes });
      scheduleBroadcastAnnotations({ stickyNotes: newNotes });
    }
    if (textChanged) {
      setTextBoxes(newtexts);
      scheduleSaveAnnotations({ textBoxes: newtexts });
      scheduleBroadcastAnnotations({ textBoxes: newtexts });
    }
    if (masksChanged) {
      setMasks(newMasks);
      scheduleSaveAnnotations({ masks: newMasks });
      scheduleBroadcastAnnotations({ masks: newMasks });
    }
    if (linesChanged) {
      setLines(newLines);
      scheduleSaveAnnotations({ lines: newLines });
      scheduleBroadcastAnnotations({ lines: newLines });
    }
    if (boxesChanged) {
      setBoxes(newBoxes);
      scheduleSaveAnnotations({ boxes: newBoxes });
      scheduleBroadcastAnnotations({ boxes: newBoxes });
    }

    setSelectedItems([]);
    setSelectionBox(null);
  }
}
