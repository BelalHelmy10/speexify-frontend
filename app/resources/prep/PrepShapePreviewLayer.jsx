// app/resources/prep/PrepShapePreviewLayer.jsx

export default function PrepShapePreviewLayer({
  shapeDrag,
  penColor,
  TOOL_LINE,
  TOOL_BOX,
}) {
  return (
    <>
      {shapeDrag && shapeDrag.mode === "creating" && shapeDrag.tool === TOOL_LINE && (
        <svg
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 9997,
          }}
          width="100%"
          height="100%"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
        >
          <line
            x1={shapeDrag.startX}
            y1={shapeDrag.startY}
            x2={shapeDrag.currentX}
            y2={shapeDrag.currentY}
            stroke={penColor}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
          />
        </svg>
      )}

      {shapeDrag && shapeDrag.mode === "creating" && shapeDrag.tool === TOOL_BOX && (
        <svg
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 9997,
          }}
          width="100%"
          height="100%"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
        >
          <rect
            x={Math.min(shapeDrag.startX, shapeDrag.currentX)}
            y={Math.min(shapeDrag.startY, shapeDrag.currentY)}
            width={Math.abs(shapeDrag.currentX - shapeDrag.startX)}
            height={Math.abs(shapeDrag.currentY - shapeDrag.startY)}
            fill="none"
            stroke={penColor}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </>
  );
}
