"use client";

import { useEffect, useRef } from "react";

/**
 * CustomCursor — magnetic coral dot + trailing navy ring.
 * Only activates on pointer:fine (desktop mouse). Hides on touch.
 */
export default function CustomCursor() {
    const dotRef = useRef(null);
    const ringRef = useRef(null);
    const pos = useRef({ x: -100, y: -100 });
    const ring = useRef({ x: -100, y: -100 });
    const raf = useRef(null);

    useEffect(() => {
        // Abort on coarse pointer (touch) devices
        if (window.matchMedia("(pointer: coarse)").matches) return;

        const dot = dotRef.current;
        const ringEl = ringRef.current;
        if (!dot || !ringEl) return;

        const onMove = (e) => {
            pos.current = { x: e.clientX, y: e.clientY };
        };

        const onEnterLink = () => ringEl.classList.add("cursor-ring--hover");
        const onLeaveLink = () => ringEl.classList.remove("cursor-ring--hover");

        window.addEventListener("mousemove", onMove);

        // Lerp animation loop for ring lag
        const lerp = (a, b, t) => a + (b - a) * t;
        const animate = () => {
            ring.current.x = lerp(ring.current.x, pos.current.x, 0.12);
            ring.current.y = lerp(ring.current.y, pos.current.y, 0.12);

            dot.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) translate(-50%, -50%)`;
            ringEl.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px) translate(-50%, -50%)`;

            raf.current = requestAnimationFrame(animate);
        };
        raf.current = requestAnimationFrame(animate);

        // Scale ring on interactive elements
        document
            .querySelectorAll("a, button, [role='button'], input, textarea, label")
            .forEach((el) => {
                el.addEventListener("mouseenter", onEnterLink);
                el.addEventListener("mouseleave", onLeaveLink);
            });

        // Hide native cursor only on desktop devices
        document.documentElement.style.cursor = "none";

        return () => {
            window.removeEventListener("mousemove", onMove);
            cancelAnimationFrame(raf.current);
            document.documentElement.style.cursor = "";
        };
    }, []);

    return (
        <>
            <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
            <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
        </>
    );
}
