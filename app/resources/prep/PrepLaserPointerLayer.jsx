// app/resources/prep/PrepLaserPointerLayer.jsx
"use client";

import { useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   Premium Laser Pointer Layer
   ─────────────────────────────────────────────────────────────────────────
   Renders a glow-tipped cursor with a smoothly fading trail for the teacher
   pointer. Trail points fade out over ~1.5s using a requestAnimationFrame
   loop for 60fps performance. The trail is drawn on a <canvas> for
   silky-smooth rendering without DOM thrash.
   ═══════════════════════════════════════════════════════════════════════════ */

const TRAIL_DURATION_MS = 1500;  // trail point lifetime
const TRAIL_MAX_POINTS = 80;     // max stored trail points
const DOT_RADIUS = 5;
const GLOW_RADIUS = 14;

// Coral laser color matching brand
const LASER_COLOR = { r: 242, g: 92, b: 46 };   // #f25c2e
const LASER_GLOW = { r: 255, g: 130, b: 80 };

export default function PrepLaserPointerLayer({
  menusOpen,
  teacherPointer,
  learnerPointers,
  colorForId,
}) {
  const canvasRef = useRef(null);
  const trailRef = useRef([]);    // [{x, y, t}] — normalized coords + timestamp
  const rafRef = useRef(null);
  const lastPosRef = useRef(null);
  const pointerRef = useRef(null); // current teacher pointer (avoids rAF restart)

  // Sync pointer prop to ref + push trail point
  useEffect(() => {
    pointerRef.current = teacherPointer;

    if (!teacherPointer) {
      lastPosRef.current = null;
      return;
    }

    const now = performance.now();
    const last = lastPosRef.current;

    if (!last || last.x !== teacherPointer.x || last.y !== teacherPointer.y) {
      trailRef.current.push({
        x: teacherPointer.x,
        y: teacherPointer.y,
        t: now,
      });

      if (trailRef.current.length > TRAIL_MAX_POINTS) {
        trailRef.current = trailRef.current.slice(-TRAIL_MAX_POINTS);
      }

      lastPosRef.current = { x: teacherPointer.x, y: teacherPointer.y };
    }
  }, [teacherPointer]);

  // Stable animation loop — reads from refs only
  useEffect(() => {
    let active = true;

    function drawFrame() {
      if (!active) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const now = performance.now();

      // Remove expired points
      trailRef.current = trailRef.current.filter(
        (pt) => now - pt.t < TRAIL_DURATION_MS
      );
      const activeTrail = trailRef.current;
      const pointer = pointerRef.current;

      // ─── Draw the trail ───
      if (activeTrail.length > 1) {
        for (let i = 1; i < activeTrail.length; i++) {
          const prev = activeTrail[i - 1];
          const curr = activeTrail[i];

          const age = now - curr.t;
          const alpha = Math.max(0, 1 - age / TRAIL_DURATION_MS);
          const lineWidth = 2.5 * alpha + 0.5;

          const x1 = prev.x * rect.width;
          const y1 = prev.y * rect.height;
          const x2 = curr.x * rect.width;
          const y2 = curr.y * rect.height;

          // Outer glow
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(${LASER_GLOW.r}, ${LASER_GLOW.g}, ${LASER_GLOW.b}, ${alpha * 0.3})`;
          ctx.lineWidth = lineWidth + 6;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();

          // Core line
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(${LASER_COLOR.r}, ${LASER_COLOR.g}, ${LASER_COLOR.b}, ${alpha * 0.85})`;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
        }
      }

      // ─── Draw the pointer dot ───
      if (pointer) {
        const cx = pointer.x * rect.width;
        const cy = pointer.y * rect.height;

        // Radial glow
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, GLOW_RADIUS);
        gradient.addColorStop(0, `rgba(${LASER_GLOW.r}, ${LASER_GLOW.g}, ${LASER_GLOW.b}, 0.55)`);
        gradient.addColorStop(0.4, `rgba(${LASER_COLOR.r}, ${LASER_COLOR.g}, ${LASER_COLOR.b}, 0.2)`);
        gradient.addColorStop(1, `rgba(${LASER_COLOR.r}, ${LASER_COLOR.g}, ${LASER_COLOR.b}, 0)`);

        ctx.beginPath();
        ctx.arc(cx, cy, GLOW_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(cx, cy, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${LASER_COLOR.r}, ${LASER_COLOR.g}, ${LASER_COLOR.b})`;
        ctx.fill();

        // White specular highlight
        ctx.beginPath();
        ctx.arc(cx - 1.5, cy - 1.5, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(drawFrame);
    }

    rafRef.current = requestAnimationFrame(drawFrame);

    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Don't render anything when menus are open
  if (menusOpen) return null;

  return (
    <>
      {/* Teacher laser pointer canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 2000000000,
        }}
      />

      {/* Learner pointers (keep existing behavior with enhanced styling) */}
      {Object.entries(learnerPointers).map(([uid, pos]) => {
        const pointerColor = colorForId(uid);
        return (
          <div
            key={uid}
            className="prep-laser-learner"
            style={{
              position: "absolute",
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              zIndex: 1999999999,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {/* Learner pointer dot */}
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: pointerColor,
                boxShadow: `0 0 8px ${pointerColor}, 0 0 16px ${pointerColor}40`,
                border: "2px solid rgba(255,255,255,0.6)",
              }}
            />
            {pos.displayName && (
              <span
                style={{
                  background: pointerColor,
                  color: "white",
                  fontSize: "9px",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "8px",
                  whiteSpace: "nowrap",
                  boxShadow: `0 2px 8px ${pointerColor}60`,
                  letterSpacing: "0.02em",
                }}
              >
                {pos.displayName}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
