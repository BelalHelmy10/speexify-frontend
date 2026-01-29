"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A wrapper to trigger a cinematic fade-up/reveal when visible.
 * @param {string} as - Tag to render (div, span, section, etc.)
 * @param {string} className - Extra classes
 * @param {object} style - Inline styles
 * @param {number} delay - Delay in seconds
 * @param {boolean} blur - Start with a blur effect? (default true)
 */
export default function FadeIn({
    children,
    as: Component = "div",
    className = "",
    style = {},
    delay = 0,
    blur = true,
    ...props
}) {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            {
                threshold: 0.15,
                rootMargin: "0px 0px -50px 0px", // Trigger when slightly inside viewport
            }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) observer.disconnect();
        };
    }, []);

    const baseStyles = {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translate3d(0, 0, 0)" : "translate3d(0, 30px, 0)",
        filter: blur ? (isVisible ? "blur(0)" : "blur(10px)") : "none",
        transition: `opacity 0.8s ease-out ${delay}s, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s, filter 0.8s ease-out ${delay}s`,
        willChange: "opacity, transform, filter",
        ...style,
    };

    return (
        <Component
            ref={ref}
            className={className}
            style={baseStyles}
            {...props}
        >
            {children}
        </Component>
    );
}
