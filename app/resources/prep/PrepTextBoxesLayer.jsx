// app/resources/prep/PrepTextBoxesLayer.jsx

export default function PrepTextBoxesLayer({
  textBoxes,
  isPdf,
  pdfCurrentPage,
  activeTextId,
  resizeState,
  widthResizeState,
  heightResizeState,
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
  startHeightResize,
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
          const isHeightResizing = heightResizeState?.id === box.id;
          const isSelected = selectedItems.some(
            (i) => i.type === "text" && i.id === box.id
          );

          const baseFontSize = box.fontSize || 16;
          const baseWidth = box.width || 150;
          const baseHeight = box.height || null;
          const fontSize = Math.round(baseFontSize * annotationScale);
          const boxWidth = Math.round(baseWidth * annotationScale);
          const boxHeight = baseHeight
            ? Math.round(baseHeight * annotationScale)
            : null;
          const hasManualLineBreaks = /[\r\n]/.test(box.text || "");
          const shouldPreserveLineBreaks = hasManualLineBreaks || !box.autoWidth;
          const normalizedTextLength = String(box.text || "")
            .replace(/\s+/g, " ")
            .trim().length;
          const textLines = String(box.text || "").split(/\r\n|\r|\n/);
          const longestLineChars = textLines.reduce(
            (max, line) => Math.max(max, line.length),
            0
          );
          const isLargeTextBlock =
            !box.autoWidth &&
            (normalizedTextLength > 260 || longestLineChars > 95);

          return (
            <div
              key={box.id}
              className={
                "prep-text-box" +
                (isEditing ? " prep-text-box--editing" : "") +
                (isResizing ? " prep-text-box--resizing" : "") +
                (isWidthResizing ? " prep-text-box--width-resizing" : "") +
                (isHeightResizing ? " prep-text-box--height-resizing" : "") +
                (isLargeTextBlock ? " prep-text-box--text-block" : "") +
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
                        height: boxHeight ? `${boxHeight}px` : undefined,
                        maxHeight:
                          isLargeTextBlock && !boxHeight
                            ? "min(70vh, 620px)"
                            : undefined,
                      }}
                    >
                      <span
                        className="prep-text-box__vertical-handle prep-text-box__vertical-handle--top"
                        onMouseDown={(e) => {
                          if (blurDebounceRef.current) {
                            clearTimeout(blurDebounceRef.current);
                          }
                          startHeightResize(e, box, "top");
                        }}
                      />

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
                          height: boxHeight ? "100%" : undefined,
                          width: box.autoWidth ? `${boxWidth}px` : "100%",
                          minWidth: box.autoWidth ? "100px" : undefined,
                          whiteSpace: shouldPreserveLineBreaks ? "pre-wrap" : "nowrap",
                          overflowWrap: shouldPreserveLineBreaks ? "break-word" : "normal",
                          wordBreak: "normal",
                          resize: "none",
                          maxHeight:
                            isLargeTextBlock && !boxHeight
                              ? "min(68vh, 590px)"
                              : undefined,
                          overflowX:
                            isLargeTextBlock || boxHeight ? "hidden" : "visible",
                          overflowY: boxHeight || isLargeTextBlock
                            ? "auto"
                            : box.autoWidth
                              ? "visible"
                              : "hidden",
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

                      <span
                        className="prep-text-box__vertical-handle prep-text-box__vertical-handle--bottom"
                        onMouseDown={(e) => {
                          if (blurDebounceRef.current) {
                            clearTimeout(blurDebounceRef.current);
                          }
                          startHeightResize(e, box, "bottom");
                        }}
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
                    height: boxHeight ? `${boxHeight}px` : undefined,
                    whiteSpace: shouldPreserveLineBreaks ? "pre-wrap" : "nowrap",
                    overflowWrap: shouldPreserveLineBreaks ? "break-word" : "normal",
                    wordBreak: "normal",
                    maxHeight:
                      isLargeTextBlock && !boxHeight ? "min(70vh, 620px)" : undefined,
                    overflowX: isLargeTextBlock || boxHeight ? "hidden" : "visible",
                    overflowY: boxHeight || isLargeTextBlock ? "auto" : "visible",
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
