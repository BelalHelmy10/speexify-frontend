// src/components/GoogleButton.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { getDictionary, t } from "@/app/i18n";

/**
 * Responsive, i18n-aware Google button:
 * - Measures its container width
 * - Clamps it into Google's preferred range (300–400px)
 * - Uses current locale (/ar -> ar, otherwise en)
 */
export default function GoogleButton({ onSuccess, onError, ...rest }) {
  const containerRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(null);

  // Detect locale from URL
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";

  // i18n (login section)
  const dict = getDictionary(locale, "login");
  const ariaLabel = t(dict, "google_button_aria");

  const handleSuccess = (resp) => {
    if (typeof onSuccess === "function") onSuccess(resp);
    else console.log("[GoogleButton] success:", resp);
  };

  const handleError = (err) => {
    if (typeof onError === "function") onError(err);
    else console.error("[GoogleButton] error:", err);
  };

  useEffect(() => {
    function updateWidth() {
      if (!containerRef.current) return;
      const w = containerRef.current.getBoundingClientRect().width;

      // Clamp to 300–400 so the Google button looks good
      const clamped = Math.min(400, Math.max(300, Math.round(w)));
      setButtonWidth(clamped);
    }

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%" }}
      dir={locale === "ar" ? "rtl" : "ltr"}
      aria-label={ariaLabel}
    >
      {buttonWidth && (
        <GoogleLogin
          useOneTap={false}
          ux_mode="popup"
          onSuccess={handleSuccess}
          onError={handleError}
          theme="outline"
          size="large"
          shape="rectangular"
          text="signin_with"
          width={String(buttonWidth)} // pixels, as a string
          locale={locale}
          {...rest}
        />
      )}
    </div>
  );
}
