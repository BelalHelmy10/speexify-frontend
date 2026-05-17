"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { isFocusedWorkspacePath } from "@/lib/chromeRoutes";

export default function ScrollToTop() {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);
    const isFocusedWorkspace = isFocusedWorkspacePath(pathname);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 400) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    if (isFocusedWorkspace || !isVisible) return null;

    return (
        <button
            type="button"
            className="spx-scroll-top"
            onClick={scrollToTop}
            aria-label="Scroll to top"
        >
            <ArrowUp size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>
    );
}
