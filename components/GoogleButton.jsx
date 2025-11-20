// src/components/GoogleButton.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

/**
 * Responsive Google button:
 * - Measures its container width
 * - Clamps it into Google's preferred range (300–400px)
 * - Passes that width to Google so the "Sign in as ..." variant
 *   renders correctly without being squashed or cut.
 */
export default function GoogleButton({ onSuccess, onError, ...rest }) {
  const containerRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(null);

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

      // Google recommends 200–400; we clamp to 300–400 so text
      // doesn't get tiny, but still fits nicely in your card.
      const clamped = Math.min(400, Math.max(300, Math.round(w)));
      setButtonWidth(clamped);
    }

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
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
          {...rest}
        />
      )}
    </div>
  );
}
