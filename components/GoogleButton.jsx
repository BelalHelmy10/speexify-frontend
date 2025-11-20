// src/components/GoogleButton.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

/**
 * Responsive Google button:
 * - Measures its container width
 * - Passes that width (in px) to GoogleLogin
 * - So it stays as wide as the inputs, even when it says "Sign in as ..."
 */
export default function GoogleButton({ onSuccess, onError, ...rest }) {
  const containerRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(0);

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
      // round and clamp just in case
      const clamped = Math.max(200, Math.round(w));
      setButtonWidth(clamped);
    }

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      {buttonWidth > 0 && (
        <GoogleLogin
          useOneTap={false}
          ux_mode="popup"
          onSuccess={handleSuccess}
          onError={handleError}
          theme="outline"
          size="large"
          shape="rectangular"
          text="signin_with"
          width={String(buttonWidth)} // Google expects pixels as a string
          {...rest}
        />
      )}
    </div>
  );
}
