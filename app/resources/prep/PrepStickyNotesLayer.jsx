// app/resources/prep/PrepStickyNotesLayer.jsx

export default function PrepStickyNotesLayer({
  stickyNotes,
  isPdf,
  pdfCurrentPage,
  selectedItems,
  getZIndexFromId,
  startNoteDrag,
  deleteNote,
  updateNoteText,
  tool,
  TOOL_SELECT,
  notePlaceholder,
}) {
  return (
    <>
      {stickyNotes
        .filter((note) => !isPdf || note.page === pdfCurrentPage || !note.page)
        .map((note) => {
          const isSelected = selectedItems.some(
            (i) => i.type === "note" && i.id === note.id
          );

          return (
            <div
              key={note.id}
              className={`prep-sticky-note${isSelected ? " is-selected" : ""}`}
              style={{
                left: `${note.x * 100}%`,
                top: `${note.y * 100}%`,
                zIndex: getZIndexFromId(note.id),
              }}
            >
              <div
                className="prep-sticky-note__header"
                onMouseDown={(e) => startNoteDrag(e, note)}
              >
                <button
                  type="button"
                  className="prep-sticky-note__close"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note.id);
                  }}
                >
                  ×
                </button>
              </div>
              <textarea
                className="prep-sticky-note__textarea"
                dir="auto"
                placeholder={notePlaceholder}
                value={note.text}
                onChange={(e) => updateNoteText(note.id, e.target.value)}
                onMouseDown={(e) => tool !== TOOL_SELECT && e.stopPropagation()}
              />
            </div>
          );
        })}
    </>
  );
}
