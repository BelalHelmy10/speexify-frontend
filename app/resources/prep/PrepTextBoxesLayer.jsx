// app/resources/prep/PrepTextBoxesLayer.jsx

export default function PrepTextBoxesLayer({
  textBoxes,
  isPdf,
  pdfCurrentPage,
  activeTextId,
  resizeState,
  widthResizeState,
  selectedItems,
  annotationScale,
  tool,
  TOOL_TEXT,
  TOOL_SELECT,
  getZIndexFromId,
  deleteTextBox,
  startTextDrag,
  blurDebounceRef,
  startWidthResize,
  textAreaRefs,
  updateTextBoxText,
  handleTextBoxBlur,
  autoResizeTextarea,
  startFontSizeResize,
  setActiveTextId,
  textPlaceholder,
}) {
  return (
    <>
      {textBoxes
        .filter((box) => !isPdf || box.page === pdfCurrentPage || !box.page)
        .map((box) => {
          const isEditing = activeTextId === box.id;
          const isResizing = resizeState?.id === box.id;
          const isWidthResizing = widthResizeState?.id === box.id;
          const isSelected = selectedItems.some(
            (i) => i.type === "text" && i.id === box.id
          );

          const baseFontSize = box.fontSize || 16;
          const baseWidth = box.width || 150;
          const fontSize = Math.round(baseFontSize * annotationScale);
          const boxWidth = Math.round(baseWidth * annotationScale);

          return (
            <div
              key={box.id}
              className={
                "prep-text-box" +
                (isEditing ? " prep-text-box--editing" : "") +
                (isResizing ? " prep-text-box--resizing" : "") +
                (isWidthResizing ? " prep-text-box--width-resizing" : "") +
                (isSelected ? " is-selected" : "")
              }
              style={{
                position: "absolute",
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                transform: "translate(-50%, -50%)",
                pointerEvents:
                  tool === TOOL_TEXT || tool === TOOL_SELECT ? "auto" : "none",
                zIndex: getZIndexFromId(box.id),
              }}
            >
              {isEditing ? (
                <>
                  <div className="prep-text-box__toolbar">
                    <button
                      type="button"
                      className="prep-text-box__toolbar-btn prep-text-box__toolbar-btn--delete"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteTextBox(box.id);
                      }}
                      title="Delete"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="prep-text-box__toolbar-btn prep-text-box__toolbar-btn--move"
                      onMouseDown={(e) => startTextDrag(e, box)}
                      title="Move"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="5 9 2 12 5 15" />
                        <polyline points="9 5 12 2 15 5" />
                        <polyline points="15 19 12 22 9 19" />
                        <polyline points="19 9 22 12 19 15" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <line x1="12" y1="2" x2="12" y2="22" />
                      </svg>
                    </button>
                  </div>

                  <div className="prep-text-box__container">
                    <span
                      className="prep-text-box__side-handle prep-text-box__side-handle--left"
                      onMouseDown={(e) => {
                        if (blurDebounceRef.current) {
                          clearTimeout(blurDebounceRef.current);
                        }
                        startWidthResize(e, box, "left");
                      }}
                    />

                    <div
                      className="prep-text-box__input-area"
                      style={{
                        width: box.autoWidth ? "auto" : `${boxWidth}px`,
                        minWidth: box.autoWidth ? `${boxWidth}px` : undefined,
                      }}
                    >
                      <textarea
                        ref={(el) => {
                          if (el) textAreaRefs.current[box.id] = el;
                        }}
                        data-textbox-id={box.id}
                        className="prep-text-box__textarea"
                        dir="auto"
                        wrap={box.autoWidth ? "off" : "soft"}
                        style={{
                          color: box.color,
                          fontSize: `${fontSize}px`,
                          width: box.autoWidth ? `${boxWidth}px` : "100%",
                          minWidth: box.autoWidth ? "100px" : undefined,
                          whiteSpace: box.autoWidth ? "nowrap" : "pre-wrap",
                          overflowWrap: box.autoWidth ? "normal" : "break-word",
                          wordBreak: "normal",
                          resize: "none",
                          overflow: box.autoWidth ? "visible" : "hidden",
                        }}
                        placeholder={textPlaceholder}
                        value={box.text}
                        onChange={(e) => updateTextBoxText(box.id, e.target.value)}
                        onBlur={() => handleTextBoxBlur(box.id)}
                        onFocus={() => {
                          if (blurDebounceRef.current) {
                            clearTimeout(blurDebounceRef.current);
                          }
                        }}
                        onMouseDown={(e) => {
                          if (tool !== TOOL_SELECT) e.stopPropagation();
                          if (blurDebounceRef.current) {
                            clearTimeout(blurDebounceRef.current);
                          }
                        }}
                        onInput={() => autoResizeTextarea(box.id)}
                      />

                      <span
                        className="prep-text-box__fontsize-handle"
                        onMouseDown={(e) => {
                          if (blurDebounceRef.current) {
                            clearTimeout(blurDebounceRef.current);
                          }
                          startFontSizeResize(e, box);
                        }}
                        title="Resize font"
                      />
                    </div>

                    <span
                      className="prep-text-box__side-handle prep-text-box__side-handle--right"
                      onMouseDown={(e) => {
                        if (blurDebounceRef.current) {
                          clearTimeout(blurDebounceRef.current);
                        }
                        startWidthResize(e, box, "right");
                      }}
                    />
                  </div>
                </>
              ) : (
                <div
                  className="prep-text-box__label"
                  dir="auto"
                  style={{
                    color: box.color,
                    fontSize: `${fontSize}px`,
                    width: `${boxWidth}px`,
                    whiteSpace: box.autoWidth ? "nowrap" : "pre-wrap",
                    overflowWrap: box.autoWidth ? "normal" : "break-word",
                    wordBreak: "normal",
                    overflowX: "visible",
                    overflowY: "visible",
                  }}
                  onMouseDown={(e) => startTextDrag(e, box)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setActiveTextId(box.id);
                    setTimeout(() => autoResizeTextarea(box.id), 0);
                  }}
                >
                  {box.text}
                  <span
                    className="prep-text-box__resize-handle"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startFontSizeResize(e, box);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
    </>
  );
}
