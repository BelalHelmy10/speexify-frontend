// app/LocaleShell.js
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function LocaleShell({ children }) {
  const pathname = usePathname();
  const isArabic = pathname?.startsWith("/ar");

  useEffect(() => {
    const html = document.documentElement;

    html.lang = isArabic ? "ar" : "en";
    html.dir = isArabic ? "rtl" : "ltr";

    document.body.classList.toggle("rtl", isArabic);
  }, [isArabic]);

  return children;
}
