// src/components/GoogleButton.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { getDictionary, t } from "@/app/i18n";

/**
 * Responsive, i18n-aware Google button:
 * - Measures its container width
 * - Clamps it so the native Google iframe stays inside narrow cards
 * - Uses current locale (/ar -> ar, otherwise en)
 */
export default function GoogleButton({
  onSuccess,
  onError,
  localeOverride,
  label,
  ...rest
}) {
  const containerRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(null);

  // Detect locale from URL
  const pathname = usePathname();
  const routeLocale = pathname?.startsWith("/ar") ? "ar" : "en";
  const locale = localeOverride || routeLocale;
  const googleLocale = locale === "ar" ? "ar" : "en";
  const hasLocalLabel = Boolean(label);

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

      // Keep the native Google iframe inside narrow mobile cards.
      const clamped = Math.min(400, Math.max(200, Math.round(w)));
      setButtonWidth(clamped);
    }

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div
      ref={containerRef}
      className={hasLocalLabel ? "google-button-localized" : undefined}
      style={{ width: "100%" }}
      dir={locale === "ar" ? "rtl" : "ltr"}
      aria-label={ariaLabel}
    >
      {hasLocalLabel && (
        <div className="google-button-localized__label" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{label}</span>
        </div>
      )}
      {buttonWidth && (
        <div
          className={
            hasLocalLabel ? "google-button-localized__native" : undefined
          }
        >
          <GoogleLogin
            key={googleLocale}
            useOneTap={false}
            ux_mode="popup"
            onSuccess={handleSuccess}
            onError={handleError}
            theme="outline"
            size="large"
            shape="rectangular"
            text="signin_with"
            width={String(buttonWidth)} // pixels, as a string
            locale={googleLocale}
            {...rest}
          />
        </div>
      )}
    </div>
  );
}
