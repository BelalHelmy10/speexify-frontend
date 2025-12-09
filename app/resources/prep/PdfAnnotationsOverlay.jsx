// app/resources/prep/PdfAnnotationsOverlay.jsx
"use client";

import { useState, useRef, useEffect } from "react";

export default function PdfAnnotationsOverlay({ containerEl }) {
  const [strokes, setStrokes] = useState([]); // [{ id, points: [{x,y}], color, width }]
  const isDrawingRef = useRef(false);
  const activeStrokeIdRef = useRef(null);

  // Helper: event -> normalized point in [0, 1]
  function getNormalizedPoint(evt) {
    if (!containerEl) return { x: 0, y: 0 };
    const rect = containerEl.getBoundingClientRect();
    const x = (evt.clientX - rect.left) / rect.width;
    const y = (evt.clientY - rect.top) / rect.height;
    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    };
  }

  function handlePointerDown(evt) {
    if (!containerEl) return;
    evt.preventDefault();
    evt.stopPropagation();

    const point = getNormalizedPoint(evt);
    const id = crypto.randomUUID?.() || String(Date.now());

    isDrawingRef.current = true;
    activeStrokeIdRef.current = id;

    setStrokes((prev) => [
      ...prev,
      {
        id,
        points: [point],
        color: "#ff0000", // customize or pull from tool state
        width: 2,
      },
    ]);

    // Capture pointer so we keep receiving move/up even if it leaves the element
    evt.currentTarget.setPointerCapture?.(evt.pointerId);
  }

  function handlePointerMove(evt) {
    if (!isDrawingRef.current || !activeStrokeIdRef.current) return;
    if (!containerEl) return;

    const point = getNormalizedPoint(evt);

    setStrokes((prev) => {
      const idx = prev.findIndex((s) => s.id === activeStrokeIdRef.current);
      if (idx === -1) return prev;

      const next = [...prev];
      const stroke = next[idx];
      next[idx] = {
        ...stroke,
        points: [...stroke.points, point],
      };
      return next;
    });
  }

  function handlePointerUp(evt) {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    activeStrokeIdRef.current = null;

    try {
      evt.currentTarget.releasePointerCapture?.(evt.pointerId);
    } catch (_) {
      // ignore
    }
  }

  // If containerEl resizes, re-render will automatically adapt because we always
  // multiply normalized coords by clientWidth/clientHeight
  const [size, setSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    if (!containerEl) return;

    function updateSize() {
      setSize({
        width: containerEl.clientWidth || 1,
        height: containerEl.clientHeight || 1,
      });
    }

    updateSize();

    // Optional: observe resize for smoother updates
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerEl);

    return () => {
      observer.disconnect();
    };
  }, [containerEl]);

  const { width, height } = size;

  return (
    <svg
      className="prep-annotations-svg"
      width="100%"
      height="100%"
      style={{
        display: "block",
        touchAction: "none", // important for touch drawing
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {strokes.map((stroke) => {
        const pointsAttr = stroke.points
          .map((p) => `${p.x * width},${p.y * height}`)
          .join(" ");

        return (
          <polyline
            key={stroke.id}
            points={pointsAttr}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}
