// app/resources/prep/PrepTextBoxesLayer.jsx

import { useLayoutEffect, useRef } from "react";
import { getPrepTextClickOffset, syncPrepTextEditor } from "./prepTextEditorDOM";

import { getPrepTextColorSegments } from "./prepTextBoxLogic";

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
  penColor,
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
  const pendingEdit = useRef(null);
  useLayoutEffect(() => {
    const textarea = textAreaRefs.current[activeTextId];
    if (!textarea) return;
    autoResizeTextarea(activeTextId);
    const pending = pendingEdit.current;
    if (pending?.id === activeTextId) {
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(pending.offset, pending.offset);
      textarea.scrollTop = pending.scrollTop;
      textarea.scrollLeft = pending.scrollLeft;
      pendingEdit.current = null;
    }
    const sync = () => syncPrepTextEditor(textarea);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(textarea);
    document.fonts?.addEventListener("loadingdone", sync);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", sync);
    };
  }, [activeTextId, textBoxes, annotationScale, autoResizeTextarea, textAreaRefs]);
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
          const colorSegments = getPrepTextColorSegments(
            box.text || "",
            box.colorRuns,
            box.color || penColor || "#111111"
          );
          const richTextContent = colorSegments.map((segment, index) => (
            <span
              key={`${box.id}-color-${index}`}
              style={{ color: segment.color }}
            >
              {segment.text}
            </span>
          ));
          const textStyle = {
            fontSize: `${fontSize}px`,
            whiteSpace: shouldPreserveLineBreaks ? "pre-wrap" : "pre",
            overflowWrap: shouldPreserveLineBreaks ? "break-word" : "normal",
            wordBreak: "normal",
          };
          const viewportStyle = {
            ...textStyle,
            width: `${boxWidth}px`,
            height: boxHeight ? `${boxHeight}px` : undefined,
            maxHeight: isLargeTextBlock && !boxHeight ? "min(70vh, 620px)" : undefined,
            overflow: "auto",
          };
          // A div needs a final line marker to match a textarea's trailing newline.
          const trailingLine = !box.text || /[\r\n]$/.test(box.text) ? "\u200b" : null;

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
                      style={{ width: `${boxWidth}px`, height: boxHeight ? `${boxHeight}px` : undefined }}
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

                      {box.text ? (
                        <div
                          className="prep-text-box__rich-preview"
                          aria-hidden="true"
                          dir="auto"
                          style={textStyle}
                        >
                          {richTextContent}{trailingLine}
                        </div>
                      ) : null}

                      <textarea
                        ref={(el) => {
                          if (el) textAreaRefs.current[box.id] = el;
                          else delete textAreaRefs.current[box.id];
                        }}
                        data-textbox-id={box.id}
                        className="prep-text-box__textarea"
                        dir="auto"
                        rows={1}
                        wrap={shouldPreserveLineBreaks ? "soft" : "off"}
                        style={{
                          ...viewportStyle,
                          width: "100%",
                          height: boxHeight ? "100%" : undefined,
                          color: box.text ? "transparent" : box.color,
                          caretColor: penColor || box.color,
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
                          e.stopPropagation();
                          if (blurDebounceRef.current) {
                            clearTimeout(blurDebounceRef.current);
                          }
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onWheel={(e) => {
                          // The annotation layer sits inside the board/PDF
                          // scroller. Keep wheel input on the focused editor;
                          // otherwise the parent consumes it for board scroll
                          // or zoom before the textarea can move its content.
                          e.stopPropagation();
                          e.preventDefault();
                          const textarea = e.currentTarget;
                          textarea.scrollTop += e.deltaY;
                          textarea.scrollLeft += e.deltaX;
                          syncPrepTextEditor(textarea);
                        }}
                        onScroll={(e) => syncPrepTextEditor(e.currentTarget)}
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
                  style={{ ...viewportStyle, color: box.color }}
                  onMouseDown={(e) => startTextDrag(e, box)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const label = e.currentTarget;
                    pendingEdit.current = {
                      id: box.id,
                      offset: getPrepTextClickOffset(label, e.clientX, e.clientY, (box.text || "").length),
                      scrollTop: label.scrollTop,
                      scrollLeft: label.scrollLeft,
                    };
                    setActiveTextId(box.id);
                  }}
                >
                  {richTextContent.length ? richTextContent : box.text}{trailingLine}
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
