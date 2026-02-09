// app/resources/prep/PrepViewerFrame.jsx

import PdfViewerWithSidebar from "./PdfViewerWithSidebar";

export default function PrepViewerFrame({
  hasScreenShare,
  isScreenShareActive = false,
  containerRef,
  viewport,
  screenVideoRef,
  renderAnnotationsOverlay,
  isPdf,
  pdfViewerUrl,
  pdfScrollRef,
  handlePdfNavStateChange,
  broadcastPdfFitToPage,
  locale,
  viewerUrl,
  resourceTitle,
  viewer,
}) {
  if (hasScreenShare) {
    return (
      <div
        className="prep-viewer__canvas-container"
        ref={containerRef}
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: "0 0",
        }}
      >
        <video
          ref={screenVideoRef}
          className="prep-viewer__frame prep-viewer__frame--screen-share"
          playsInline
          autoPlay
        />
        {renderAnnotationsOverlay()}
      </div>
    );
  }

  if (isScreenShareActive) {
    return (
      <div className="prep-viewer__placeholder">
        <h2>Screen sharing is active</h2>
        <p>The shared screen is being initialized. Please wait a moment.</p>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div
        className="prep-viewer__canvas-container"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: "0 0",
        }}
      >
        <PdfViewerWithSidebar
          fileUrl={pdfViewerUrl}
          onFatalError={(err) => {
            console.error("PDF failed to load in pdf.js", err);
          }}
          onContainerReady={(el) => {
            containerRef.current = el;
          }}
          onScrollContainerReady={(el) => {
            pdfScrollRef.current = el;
          }}
          onNavStateChange={handlePdfNavStateChange}
          onFitToPage={() => {
            broadcastPdfFitToPage();
          }}
          hideControls={false}
          hideSidebar={false}
          locale={locale}
        >
          {renderAnnotationsOverlay()}
        </PdfViewerWithSidebar>
      </div>
    );
  }

  return (
    <div
      className="prep-viewer__canvas-container"
      ref={containerRef}
      style={{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        transformOrigin: "0 0",
      }}
    >
      <iframe
        src={viewerUrl}
        className="prep-viewer__frame"
        title={`${resourceTitle} – ${viewer?.label || "Viewer"}`}
        allow={
          viewer?.type === "youtube"
            ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            : undefined
        }
        allowFullScreen
      />
      {renderAnnotationsOverlay()}
    </div>
  );
}
