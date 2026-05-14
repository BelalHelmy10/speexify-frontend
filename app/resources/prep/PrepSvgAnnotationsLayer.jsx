// app/resources/prep/PrepSvgAnnotationsLayer.jsx

import {
  TOOL_PEN,
  TOOL_HIGHLIGHTER,
  smoothPathCatmullRom,
  getZIndexFromId,
} from "./prepAnnotationUtils";

export default function PrepSvgAnnotationsLayer({
  strokes,
  lines,
  boxes,
  isPdf,
  pdfCurrentPage,
  penColor,
  selectionBox,
  selectedItems,
}) {
  const layerStyle = (id) => ({
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: getZIndexFromId(id),
  });

  const overlayStyle = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 1900000000,
  };

  return (
    <>
      {strokes
        .filter((stroke) => !isPdf || stroke.page === pdfCurrentPage || !stroke.page)
        .map((stroke) => {
          if (stroke.tool === TOOL_PEN && stroke.points.length > 2) {
            const smoothedPath = smoothPathCatmullRom(stroke.points, 0.5);
            return (
              <svg
                key={stroke.id}
                className="annotation-svg-layer"
                width="100%"
                height="100%"
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                style={layerStyle(stroke.id)}
              >
                <path
                  d={smoothedPath}
                  fill="none"
                  stroke={stroke.color || "#111"}
                  strokeWidth={(stroke.strokeWidth || 3) / 1000}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            );
          }

          const strokeWidthNorm =
            stroke.tool === TOOL_HIGHLIGHTER
              ? (stroke.strokeWidth || 12) / 1000
              : (stroke.strokeWidth || 3) / 1000;

          const isHighlighter = stroke.tool === TOOL_HIGHLIGHTER;
          return (
            <svg
              key={stroke.id}
              className="annotation-svg-layer"
              width="100%"
              height="100%"
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              style={layerStyle(stroke.id)}
            >
              <polyline
                points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={isHighlighter ? "#FFEB3B" : stroke.color || "#111"}
                strokeWidth={strokeWidthNorm}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={
                  isHighlighter
                    ? {
                        mixBlendMode: "multiply",
                        opacity: 0.7,
                      }
                    : undefined
                }
              />
            </svg>
          );
        })}

      {lines
        .filter((l) => !isPdf || l.page === pdfCurrentPage || !l.page)
        .map((l) => (
          <svg
            key={l.id}
            className="annotation-svg-layer"
            width="100%"
            height="100%"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            style={layerStyle(l.id)}
          >
            <line
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke={l.color || penColor}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
            />
          </svg>
        ))}

      {boxes
        .filter((b) => !isPdf || b.page === pdfCurrentPage || !b.page)
        .map((b) => (
          <svg
            key={b.id}
            className="annotation-svg-layer"
            width="100%"
            height="100%"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            style={layerStyle(b.id)}
          >
            <rect
              x={b.x}
              y={b.y}
              width={b.width}
              height={b.height}
              fill="none"
              stroke={b.color || penColor}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ))}

      {(selectionBox || selectedItems.length > 0) && (
        <svg
          className="annotation-svg-layer"
          width="100%"
          height="100%"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          style={overlayStyle}
        >
          {selectionBox && (
            <rect
              x={Math.min(selectionBox.startX, selectionBox.currentX)}
              y={Math.min(selectionBox.startY, selectionBox.currentY)}
              width={Math.abs(selectionBox.currentX - selectionBox.startX)}
              height={Math.abs(selectionBox.currentY - selectionBox.startY)}
              fill="rgba(33, 150, 243, 0.1)"
              stroke="#2196f3"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              strokeDasharray="4 4"
            />
          )}

          {selectedItems.map((item) => {
            if (item.type === "stroke") {
              const s = strokes.find((stroke) => stroke.id === item.id);
              if (!s || (isPdf && (s.page ?? 1) !== pdfCurrentPage)) return null;
              const isSmooth = s.tool === TOOL_PEN && s.points.length > 2;
              return isSmooth ? (
                <path
                  key={`sel-${s.id}`}
                  d={smoothPathCatmullRom(s.points, 0.5)}
                  fill="none"
                  stroke="#2196f3"
                  strokeWidth={(s.strokeWidth || 3) / 1000 + 0.003}
                  strokeOpacity={0.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: "none" }}
                />
              ) : (
                <polyline
                  key={`sel-${s.id}`}
                  points={s.points.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#2196f3"
                  strokeWidth={(s.strokeWidth || 3) / 1000 + 0.003}
                  strokeOpacity={0.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: "none" }}
                />
              );
            }

            if (item.type === "line") {
              const l = lines.find((line) => line.id === item.id);
              if (!l || (isPdf && (l.page ?? 1) !== pdfCurrentPage)) return null;
              return (
                <line
                  key={`sel-${l.id}`}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  stroke="#2196f3"
                  strokeWidth={3}
                  strokeOpacity={0.5}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "none" }}
                />
              );
            }

            if (item.type === "box") {
              const b = boxes.find((box) => box.id === item.id);
              if (!b || (isPdf && (b.page ?? 1) !== pdfCurrentPage)) return null;
              return (
                <rect
                  key={`sel-${b.id}`}
                  x={b.x}
                  y={b.y}
                  width={b.width}
                  height={b.height}
                  fill="none"
                  stroke="#2196f3"
                  strokeWidth={3}
                  strokeOpacity={0.5}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "none" }}
                />
              );
            }

            return null;
          })}
        </svg>
      )}
    </>
  );
}
