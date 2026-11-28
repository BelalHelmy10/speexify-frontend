// app/resources/prep/PrepToolbar.jsx

import {
  Trash2,
  Undo2,
  Redo2,
  PanelLeftClose,
  PanelLeftOpen,
  WifiOff,
} from "lucide-react";
import PrepAudioControls from "./PrepAudioControls";
import PrepToolDropdownMenus from "./PrepToolDropdownMenus";
import PrepStyleControls from "./PrepStyleControls";
import { useClassroomText } from "@/app/classroom/[sessionId]/classroomText";

export default function PrepToolbar({
  hideSidebar,
  sidebarCollapsed,
  setSidebarCollapsed,
  sidebarShowLabel,
  sidebarHideLabel,
  classroomChannel,
  channelReady,
  undo,
  redo,
  historyLength,
  redoLength,
  hasAudio,
  audioTracks,
  safeTrackIndex,
  setCurrentTrackIndex,
  setIsAudioPlaying,
  audioRef,
  isTeacher,
  canControlAudio = true,
  sendOnChannel,
  sendAudioState,
  isAudioPlaying,
  needsAudioUnlock,
  setNeedsAudioUnlock,
  currentTrackUrl,
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
  exportLabel,
  exportPngLabel,
  exportPdfLabel,
  exportHintLabel,
  viewport,
  setViewport,
  requestClearAll,
  widthPickerRef,
  setToolMenuOpen,
  widthLabel,
  penStrokeWidth,
  showWidthPicker,
  STROKE_WIDTH_OPTIONS,
  setPenStrokeWidth,
  colorMenuRef,
  penColor,
  colorMenuOpen,
  PEN_COLORS,
  setPenColor,
}) {
  const ct = useClassroomText();
  return (
    <div className="prep-annotate-toolbar" style={{ position: "relative", zIndex: 50 }}>
      {!hideSidebar && (
        <button
          type="button"
          className={
            "prep-annotate-toolbar__btn prep-annotate-toolbar__btn--sidebar" +
            (sidebarCollapsed ? " is-collapsed" : "")
          }
          onClick={() => setSidebarCollapsed((v) => !v)}
          aria-label={sidebarCollapsed ? sidebarShowLabel : sidebarHideLabel}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          <span>{sidebarCollapsed ? sidebarShowLabel : sidebarHideLabel}</span>
        </button>
      )}

      <div className="prep-annotate-toolbar__separator" />

      {classroomChannel && !channelReady && (
        <div
          style={{ marginRight: 8, color: "#f87171", display: "flex", alignItems: "center" }}
          title={ct("cr_tb_offline")}
        >
          <WifiOff size={18} />
        </div>
      )}

      <button
        type="button"
        className="prep-annotate-toolbar__btn"
        onClick={undo}
        disabled={historyLength === 0}
        aria-label={ct("cr_tb_undo_hint")}
        title={ct("cr_tb_undo_hint")}
      >
        <Undo2 size={18} /> <span>{ct("cr_tb_undo")}</span>
      </button>

      <button
        type="button"
        className="prep-annotate-toolbar__btn"
        onClick={redo}
        disabled={redoLength === 0}
        aria-label={ct("cr_tb_redo_hint")}
        title={ct("cr_tb_redo_hint")}
      >
        <Redo2 size={18} /> <span>{ct("cr_tb_redo")}</span>
      </button>

      <div className="prep-annotate-toolbar__separator" />

      <PrepAudioControls
        hasAudio={hasAudio}
        audioTracks={audioTracks}
        safeTrackIndex={safeTrackIndex}
        setCurrentTrackIndex={setCurrentTrackIndex}
        setIsAudioPlaying={setIsAudioPlaying}
        audioRef={audioRef}
        isTeacher={isTeacher}
        canControlAudio={canControlAudio}
        channelReady={channelReady}
        sendOnChannel={sendOnChannel}
        sendAudioState={sendAudioState}
        isAudioPlaying={isAudioPlaying}
        needsAudioUnlock={needsAudioUnlock}
        setNeedsAudioUnlock={setNeedsAudioUnlock}
        currentTrackUrl={currentTrackUrl}
      />

      <PrepToolDropdownMenus
        tool={tool}
        drawMenuRef={drawMenuRef}
        moreMenuRef={moreMenuRef}
        drawMenuOpen={drawMenuOpen}
        setDrawMenuOpen={setDrawMenuOpen}
        moreMenuOpen={moreMenuOpen}
        setMoreMenuOpen={setMoreMenuOpen}
        setShowWidthPicker={setShowWidthPicker}
        setColorMenuOpen={setColorMenuOpen}
        setToolSafe={setToolSafe}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        handleExport={handleExport}
        exportLabel={exportLabel}
        exportPngLabel={exportPngLabel}
        exportPdfLabel={exportPdfLabel}
        exportHintLabel={exportHintLabel}
        viewport={viewport}
        setViewport={setViewport}
      />

      <div className="prep-annotate-toolbar__separator" />

      <button
        type="button"
        className="prep-annotate-toolbar__btn prep-annotate-toolbar__btn--danger"
        onClick={requestClearAll}
        title={ct("cr_tb_clear_all")}
        aria-label={ct("cr_tb_clear_all")}
      >
        <Trash2 size={18} />
      </button>

      <PrepStyleControls
        widthPickerRef={widthPickerRef}
        setShowWidthPicker={setShowWidthPicker}
        setColorMenuOpen={setColorMenuOpen}
        setToolMenuOpen={setToolMenuOpen}
        widthLabel={widthLabel}
        penStrokeWidth={penStrokeWidth}
        showWidthPicker={showWidthPicker}
        STROKE_WIDTH_OPTIONS={STROKE_WIDTH_OPTIONS}
        setPenStrokeWidth={setPenStrokeWidth}
        colorMenuRef={colorMenuRef}
        penColor={penColor}
        colorMenuOpen={colorMenuOpen}
        PEN_COLORS={PEN_COLORS}
        setPenColor={setPenColor}
      />
    </div>
  );
}
