"use client";

// The classroom's language comes from the address: /ar/classroom/... is Arabic.
import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { classroomText } from "./classroomCopy";

export { classroomText };

export function useClassroomLocale() {
  const pathname = usePathname();
  return pathname?.startsWith("/ar") ? "ar" : "en";
}

// Returns `ct(key, vars)` for the current page language.
export function useClassroomText() {
  const locale = useClassroomLocale();
  return useCallback((key, vars) => classroomText(locale, key, vars), [locale]);
}
