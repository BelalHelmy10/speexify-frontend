
// P1-6: Delete selected items
function deleteSelectedItems() {
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

    // Filter strokes
    const newStrokes = strokes.filter((s) => {
        if (selectedIds.has(s.id)) {
            strokesChanged = true;
            hasChanges = true;
            return false;
        }
        return true;
    });

    // Filter notes
    const newNotes = stickyNotes.filter((n) => {
        if (selectedIds.has(n.id)) {
            notesChanged = true;
            hasChanges = true;
            return false;
        }
        return true;
    });

    // Filter text boxes
    const newtexts = textBoxes.filter((t) => {
        if (selectedIds.has(t.id)) {
            textChanged = true;
            hasChanges = true;
            return false;
        }
        return true;
    });

    // Filter masks
    const newMasks = masks.filter((m) => {
        if (selectedIds.has(m.id)) {
            masksChanged = true;
            hasChanges = true;
            return false;
        }
        return true;
    });

    // Filter lines
    const newLines = lines.filter((l) => {
        if (selectedIds.has(l.id)) {
            linesChanged = true;
            hasChanges = true;
            return false;
        }
        return true;
    });

    // Filter boxes
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
