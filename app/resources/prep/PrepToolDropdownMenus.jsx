// app/resources/prep/PrepToolDropdownMenus.jsx

import {
  PenTool,
  Highlighter,
  Eraser,
  Type,
  StickyNote,
  MousePointer2,
  Zap,
  Square,
  Minus,
  Grid3x3,
  Download,
  ChevronDown,
  MoreHorizontal,
  RotateCcw,
} from "lucide-react";
import {
  TOOL_PEN,
  TOOL_HIGHLIGHTER,
  TOOL_NOTE,
  TOOL_POINTER,
  TOOL_ERASER,
  TOOL_TEXT,
  TOOL_MASK,
  TOOL_LINE,
  TOOL_BOX,
  TOOL_SELECT,
} from "./prepAnnotationUtils";

export default function PrepToolDropdownMenus({
  tool,
  drawMenuRef,
  moreMenuRef,
  drawMenuOpen,
  setDrawMenuOpen,
  moreMenuOpen,
  setMoreMenuOpen,
  setShowWidthPicker,
  setColorMenuOpen,
  setToolSafe,
  showGrid,
  setShowGrid,
  handleExport,
  viewport,
  setViewport,
}) {
  return (
    <>
      <div className="prep-toolbar-dropdown" ref={drawMenuRef}>
        <button
          type="button"
          className={
            "prep-toolbar-dropdown__trigger" +
            ([TOOL_SELECT, TOOL_PEN, TOOL_HIGHLIGHTER, TOOL_ERASER, TOOL_POINTER].includes(tool)
              ? " is-active"
              : "")
          }
          onClick={() => {
            setDrawMenuOpen((v) => !v);
            setMoreMenuOpen(false);
            setShowWidthPicker(false);
            setColorMenuOpen(false);
          }}
          aria-expanded={drawMenuOpen}
          aria-haspopup="true"
        >
          {tool === TOOL_SELECT && <MousePointer2 size={18} />}
          {tool === TOOL_PEN && <PenTool size={18} />}
          {tool === TOOL_HIGHLIGHTER && <Highlighter size={18} />}
          {tool === TOOL_ERASER && <Eraser size={18} />}
          {tool === TOOL_POINTER && <Zap size={18} />}
          {![TOOL_SELECT, TOOL_PEN, TOOL_HIGHLIGHTER, TOOL_ERASER, TOOL_POINTER].includes(tool) && (
            <PenTool size={18} />
          )}
          <ChevronDown size={14} className={drawMenuOpen ? "rotated" : ""} />
        </button>

        {drawMenuOpen && (
          <div className="prep-toolbar-dropdown__menu prep-toolbar-dropdown__menu--draw">
            <button
              type="button"
              className={
                "prep-toolbar-dropdown__item" +
                (tool === TOOL_SELECT ? " is-active" : "")
              }
              onClick={() => {
                setToolSafe(TOOL_SELECT);
                setDrawMenuOpen(false);
              }}
            >
              <MousePointer2 size={16} />
              <span>Select</span>
              <kbd>V</kbd>
            </button>
            <button
              type="button"
              className={
                "prep-toolbar-dropdown__item" +
                (tool === TOOL_PEN ? " is-active" : "")
              }
              onClick={() => {
                setToolSafe(TOOL_PEN);
                setDrawMenuOpen(false);
              }}
            >
              <PenTool size={16} />
              <span>Pen</span>
              <kbd>P</kbd>
            </button>
            <button
              type="button"
              className={
                "prep-toolbar-dropdown__item" +
                (tool === TOOL_HIGHLIGHTER ? " is-active" : "")
              }
              onClick={() => {
                setToolSafe(TOOL_HIGHLIGHTER);
                setDrawMenuOpen(false);
              }}
            >
              <Highlighter size={16} />
              <span>Highlighter</span>
              <kbd>H</kbd>
            </button>
            <button
              type="button"
              className={
                "prep-toolbar-dropdown__item" +
                (tool === TOOL_ERASER ? " is-active" : "")
              }
              onClick={() => {
                setToolSafe(TOOL_ERASER);
                setDrawMenuOpen(false);
              }}
            >
              <Eraser size={16} />
              <span>Eraser</span>
              <kbd>E</kbd>
            </button>
            <button
              type="button"
              className={
                "prep-toolbar-dropdown__item" +
                (tool === TOOL_POINTER ? " is-active" : "")
              }
              onClick={() => {
                setToolSafe(TOOL_POINTER);
                setDrawMenuOpen(false);
              }}
            >
              <Zap size={16} />
              <span>Pointer</span>
              <kbd>L</kbd>
            </button>
          </div>
        )}
      </div>

      <div className="prep-toolbar-dropdown" ref={moreMenuRef}>
        <button
          type="button"
          className={
            "prep-toolbar-dropdown__trigger prep-toolbar-dropdown__trigger--more" +
            ([TOOL_TEXT, TOOL_NOTE, TOOL_LINE, TOOL_BOX, TOOL_MASK].includes(tool) || showGrid
              ? " is-active"
              : "")
          }
          onClick={() => {
            setMoreMenuOpen((v) => !v);
            setDrawMenuOpen(false);
            setShowWidthPicker(false);
            setColorMenuOpen(false);
          }}
          aria-expanded={moreMenuOpen}
          aria-haspopup="true"
        >
          {[TOOL_TEXT, TOOL_NOTE, TOOL_LINE, TOOL_BOX, TOOL_MASK].includes(tool) ? (
            <>
              {tool === TOOL_TEXT && <Type size={18} />}
              {tool === TOOL_NOTE && <StickyNote size={18} />}
              {tool === TOOL_LINE && (
                <Minus size={18} style={{ transform: "rotate(45deg)" }} />
              )}
              {tool === TOOL_BOX && <Square size={18} />}
              {tool === TOOL_MASK && (
                <Square size={18} fill="currentColor" fillOpacity={0.3} />
              )}
            </>
          ) : (
            <MoreHorizontal size={18} />
          )}
          <ChevronDown size={14} className={moreMenuOpen ? "rotated" : ""} />
        </button>

        {moreMenuOpen && (
          <div className="prep-toolbar-dropdown__menu prep-toolbar-dropdown__menu--more">
            <div className="prep-toolbar-dropdown__section-title">Annotate</div>
            <button
              type="button"
              className={
                "prep-toolbar-dropdown__item" +
                (tool === TOOL_TEXT ? " is-active" : "")
              }
              onClick={() => {
                setToolSafe(TOOL_TEXT);
                setMoreMenuOpen(false);
              }}
            >
              <Type size={16} />
              <span>Text</span>
              <kbd>T</kbd>
            </button>
            <button
              type="button"
              className={
                "prep-toolbar-dropdown__item" +
                (tool === TOOL_NOTE ? " is-active" : "")
              }
              onClick={() => {
                setToolSafe(TOOL_NOTE);
                setMoreMenuOpen(false);
              }}
            >
              <StickyNote size={16} />
              <span>Sticky Note</span>
              <kbd>N</kbd>
            </button>

            <div className="prep-toolbar-dropdown__divider" />
            <div className="prep-toolbar-dropdown__section-title">Shapes</div>
            <button
              type="button"
              className={
                "prep-toolbar-dropdown__item" +
                (tool === TOOL_LINE ? " is-active" : "")
              }
              onClick={() => {
                setToolSafe(TOOL_LINE);
                setMoreMenuOpen(false);
              }}
            >
              <Minus size={16} style={{ transform: "rotate(45deg)" }} />
              <span>Line</span>
              <kbd>1</kbd>
            </button>
            <button
              type="button"
              className={
                "prep-toolbar-dropdown__item" +
                (tool === TOOL_BOX ? " is-active" : "")
              }
              onClick={() => {
                setToolSafe(TOOL_BOX);
                setMoreMenuOpen(false);
              }}
            >
              <Square size={16} />
              <span>Rectangle</span>
              <kbd>2</kbd>
            </button>
            <button
              type="button"
              className={
                "prep-toolbar-dropdown__item" +
                (tool === TOOL_MASK ? " is-active" : "")
              }
              onClick={() => {
                setToolSafe(TOOL_MASK);
                setMoreMenuOpen(false);
              }}
            >
              <Square size={16} fill="currentColor" fillOpacity={0.3} />
              <span>Hide Mask</span>
              <kbd>M</kbd>
            </button>

            <div className="prep-toolbar-dropdown__divider" />
            <div className="prep-toolbar-dropdown__section-title">View</div>
            <button
              type="button"
              className={
                "prep-toolbar-dropdown__item" + (showGrid ? " is-active" : "")
              }
              onClick={() => {
                setShowGrid((v) => !v);
                setMoreMenuOpen(false);
              }}
            >
              <Grid3x3 size={16} />
              <span>Grid</span>
            </button>
            <button
              type="button"
              className="prep-toolbar-dropdown__item"
              onClick={() => {
                handleExport();
                setMoreMenuOpen(false);
              }}
            >
              <Download size={16} />
              <span>Export</span>
            </button>
            {(viewport.scale !== 1 || viewport.x !== 0 || viewport.y !== 0) && (
              <button
                type="button"
                className="prep-toolbar-dropdown__item"
                onClick={() => {
                  setViewport({ x: 0, y: 0, scale: 1 });
                  setMoreMenuOpen(false);
                }}
              >
                <RotateCcw size={16} />
                <span>Reset Zoom</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
