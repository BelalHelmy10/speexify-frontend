// src/components/GoogleButton.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

export default function GoogleButton({ onSuccess, onError, ...rest }) {
  const containerRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(null);

  const handleSuccess = (resp) => {
    if (typeof onSuccess === "function") onSuccess(resp);
  };

  const handleError = (err) => {
    if (typeof onError === "function") onError(err);
  };

  useEffect(() => {
    function updateWidth() {
      if (!containerRef.current) return;
      const w = containerRef.current.getBoundingClientRect().width;
      const clamped = Math.min(400, Math.max(300, Math.round(w)));
      setButtonWidth(clamped);
    }

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div
      className="google-btn-wrapper"
      ref={containerRef}
      style={{
        width: "100%",
        padding: "8px", // visual height boost
        borderRadius: "14px", // outer radius
        background: "white",
        border: "1px solid #e4e6ea",
      }}
    >
      {buttonWidth && (
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          theme="outline"
          size="large"
          shape="rectangular"
          text="signin_with"
          width={String(buttonWidth)}
          {...rest}
        />
      )}
    </div>
  );
}
