"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable]",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

/**
 * Keeps keyboard focus inside an open dialog/drawer and restores focus to the
 * control that opened it when the dialog closes.
 */
export default function useFocusTrap(
  active,
  { onEscape, restoreFocus = true, initialFocusRef = null } = {}
) {
  const rootRef = useRef(null);
  const escapeRef = useRef(onEscape);

  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active || !rootRef.current) return undefined;

    const root = rootRef.current;
    const previouslyFocused = document.activeElement;
    const getFocusable = () =>
      Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => element.getClientRects().length > 0 || element === document.activeElement
      );

    const focusTarget = initialFocusRef?.current || getFocusable()[0] || root;
    if (focusTarget === root && !root.hasAttribute("tabindex")) {
      root.setAttribute("tabindex", "-1");
    }
    requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        escapeRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        root.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? focusable.length - 1
          : currentIndex - 1
        : currentIndex === focusable.length - 1
          ? 0
          : currentIndex + 1;
      event.preventDefault();
      (focusable[nextIndex] || (event.shiftKey ? last : first)).focus();
    };

    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("keydown", onKeyDown);
      if (restoreFocus && previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [active, initialFocusRef, restoreFocus]);

  return rootRef;
}
