// app/resources/prep/PrepMasksLayer.jsx

export default function PrepMasksLayer({
  masks,
  isPdf,
  pdfCurrentPage,
  tool,
  TOOL_ERASER,
  startMaskMove,
  maskPreview,
}) {
  return (
    <>
      {masks
        .filter((mask) => !isPdf || mask.page === pdfCurrentPage || !mask.page)
        .map((mask) => (
          <div
            key={mask.id}
            className="prep-mask-block"
            style={{
              position: "absolute",
              left: `${mask.x * 100}%`,
              top: `${mask.y * 100}%`,
              width: `${mask.width * 100}%`,
              height: `${mask.height * 100}%`,
              backgroundColor: "#ffffff",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.12)",
              pointerEvents: tool === TOOL_ERASER ? "none" : "auto",
              zIndex: 49,
            }}
            onMouseDown={(e) => startMaskMove(e, mask)}
          />
        ))}

      {maskPreview && (
        <div
          className="prep-mask-block prep-mask-block--preview"
          style={{
            position: "absolute",
            left: `${maskPreview.left * 100}%`,
            top: `${maskPreview.top * 100}%`,
            width: `${maskPreview.width * 100}%`,
            height: `${maskPreview.height * 100}%`,
            backgroundColor: "rgba(255,255,255,0.85)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.2)",
            pointerEvents: "none",
          }}
        />
      )}
    </>
  );
}
