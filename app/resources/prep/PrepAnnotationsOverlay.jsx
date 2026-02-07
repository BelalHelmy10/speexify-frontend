// app/resources/prep/PrepAnnotationsOverlay.jsx

import {
  TOOL_NONE,
  TOOL_TEXT,
  TOOL_SELECT,
  TOOL_ERASER,
  TOOL_LINE,
  TOOL_BOX,
  getTouchPoint,
  getZIndexFromId,
  colorForId,
} from "./prepAnnotationUtils";
import PrepSvgAnnotationsLayer from "./PrepSvgAnnotationsLayer";
import PrepTextBoxesLayer from "./PrepTextBoxesLayer";
import PrepStickyNotesLayer from "./PrepStickyNotesLayer";
import PrepMasksLayer from "./PrepMasksLayer";
import PrepShapePreviewLayer from "./PrepShapePreviewLayer";
import PrepPointersLayer from "./PrepPointersLayer";

export default function PrepAnnotationsOverlay({ ctx }) {
  const {
    toolMenuOpen,
    colorMenuOpen,
    isPdf,
    pdfCurrentPage,
    teacherPointerByPage,
    learnerPointersByPage,
    tool,
    stickyNotes,
    textBoxes,
    masks,
    maskDrag,
    showGrid,
    measureSpanRef,
    canvasRef,
    handleMouseMove,
    handleMouseUp,
    handleGestureMove,
    gestureRef,
    handleTouchStartGesture,
    handleMouseDown,
    strokes,
    lines,
    boxes,
    penColor,
    selectionBox,
    selectedItems,
    activeTextId,
    resizeState,
    widthResizeState,
    annotationScale,
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
    startNoteDrag,
    deleteNote,
    updateNoteText,
    notePlaceholder,
    startMaskMove,
    shapeDrag,
  } = ctx;

  const menusOpen = toolMenuOpen || colorMenuOpen;

  const pointerPage = isPdf ? pdfCurrentPage : 1;
  const teacherPointer = teacherPointerByPage[pointerPage] || null;
  const learnerPointers = learnerPointersByPage[pointerPage] || {};

  const needsInteraction =
    !menusOpen &&
    (tool !== TOOL_NONE ||
      stickyNotes.length > 0 ||
      textBoxes.length > 0 ||
      masks.length > 0);

  const overlayPointerEvents = needsInteraction ? "auto" : "none";
  const overlayTouchAction = needsInteraction ? "none" : "auto";

  let maskPreview = null;
  if (maskDrag && maskDrag.mode === "creating") {
    const startX = maskDrag.startX;
    const startY = maskDrag.startY;
    const endX =
      typeof maskDrag.currentX === "number" ? maskDrag.currentX : maskDrag.startX;
    const endY =
      typeof maskDrag.currentY === "number" ? maskDrag.currentY : maskDrag.startY;

    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    maskPreview = { left, top, width, height };
  }

  return (
    <div
      className={`prep-annotate-layer tool-${tool}`}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: overlayPointerEvents,
        touchAction: overlayTouchAction,
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={(e) => {
        handleGestureMove(e);
        const pt = getTouchPoint(e);
        if (pt) handleMouseMove(pt);
      }}
      onTouchEnd={(e) => {
        if (e.touches.length < 2) {
          gestureRef.current.active = false;
        }
        e.preventDefault();
        handleMouseUp(null);
      }}
    >
      {showGrid && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            backgroundImage:
              "radial-gradient(circle, rgba(0,0,0,0.2) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      )}

      <span
        ref={measureSpanRef}
        style={{
          position: "absolute",
          left: -99999,
          top: -99999,
          visibility: "hidden",
          whiteSpace: "pre",
          pointerEvents: "none",
        }}
      />

      <canvas
        ref={canvasRef}
        className={
          "prep-annotate-canvas" +
          (tool !== TOOL_NONE ? " prep-annotate-canvas--drawing" : "")
        }
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: needsInteraction ? "auto" : "none",
          touchAction: needsInteraction ? "none" : "auto",
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={(e) => {
          if (handleTouchStartGesture(e)) return;
          e.preventDefault();
          const pt = getTouchPoint(e);
          if (pt) handleMouseDown(pt);
        }}
      />

      <PrepSvgAnnotationsLayer
        strokes={strokes}
        lines={lines}
        boxes={boxes}
        isPdf={isPdf}
        pdfCurrentPage={pdfCurrentPage}
        penColor={penColor}
        selectionBox={selectionBox}
        selectedItems={selectedItems}
      />

      <PrepTextBoxesLayer
        textBoxes={textBoxes}
        isPdf={isPdf}
        pdfCurrentPage={pdfCurrentPage}
        activeTextId={activeTextId}
        resizeState={resizeState}
        widthResizeState={widthResizeState}
        selectedItems={selectedItems}
        annotationScale={annotationScale}
        tool={tool}
        TOOL_TEXT={TOOL_TEXT}
        TOOL_SELECT={TOOL_SELECT}
        getZIndexFromId={getZIndexFromId}
        deleteTextBox={deleteTextBox}
        startTextDrag={startTextDrag}
        blurDebounceRef={blurDebounceRef}
        startWidthResize={startWidthResize}
        textAreaRefs={textAreaRefs}
        updateTextBoxText={updateTextBoxText}
        handleTextBoxBlur={handleTextBoxBlur}
        autoResizeTextarea={autoResizeTextarea}
        startFontSizeResize={startFontSizeResize}
        setActiveTextId={setActiveTextId}
        textPlaceholder={textPlaceholder}
      />

      <PrepStickyNotesLayer
        stickyNotes={stickyNotes}
        isPdf={isPdf}
        pdfCurrentPage={pdfCurrentPage}
        selectedItems={selectedItems}
        getZIndexFromId={getZIndexFromId}
        startNoteDrag={startNoteDrag}
        deleteNote={deleteNote}
        updateNoteText={updateNoteText}
        tool={tool}
        TOOL_SELECT={TOOL_SELECT}
        notePlaceholder={notePlaceholder}
      />

      <PrepMasksLayer
        masks={masks}
        isPdf={isPdf}
        pdfCurrentPage={pdfCurrentPage}
        tool={tool}
        TOOL_ERASER={TOOL_ERASER}
        startMaskMove={startMaskMove}
        maskPreview={maskPreview}
      />

      <PrepShapePreviewLayer
        shapeDrag={shapeDrag}
        penColor={penColor}
        TOOL_LINE={TOOL_LINE}
        TOOL_BOX={TOOL_BOX}
      />

      <PrepPointersLayer
        menusOpen={menusOpen}
        teacherPointer={teacherPointer}
        learnerPointers={learnerPointers}
        colorForId={colorForId}
      />
    </div>
  );
}
