"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { isFocusedWorkspacePath } from "@/lib/chromeRoutes";

export default function ScrollToTop() {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);
    const [footerInView, setFooterInView] = useState(false);
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

    useEffect(() => {
        const updateFooterState = () => {
            const footer = document.querySelector(".site-footer-wrapper");
            if (!footer) {
                setFooterInView(false);
                return;
            }

            const rect = footer.getBoundingClientRect();
            setFooterInView(rect.top < window.innerHeight - 48 && rect.bottom > 120);
        };

        updateFooterState();
        window.addEventListener("scroll", updateFooterState, { passive: true });
        window.addEventListener("resize", updateFooterState);

        return () => {
            window.removeEventListener("scroll", updateFooterState);
            window.removeEventListener("resize", updateFooterState);
        };
    }, [pathname]);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    if (isFocusedWorkspace || !isVisible || footerInView) return null;

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
