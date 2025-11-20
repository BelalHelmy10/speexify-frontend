// src/components/GoogleButton.jsx
"use client";

import { GoogleLogin } from "@react-oauth/google";

/**
 * Lightweight wrapper for @react-oauth/google.
 * Simply forwards the GIS response to parent handlers.
 *
 * Usage:
 *   <GoogleButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
 */
export default function GoogleButton({ onSuccess, onError, ...rest }) {
  const handleSuccess = (resp) => {
    if (typeof onSuccess === "function") onSuccess(resp);
    else console.log("[GoogleButton] success:", resp);
  };

  const handleError = (err) => {
    if (typeof onError === "function") onError(err);
    else console.error("[GoogleButton] error:", err);
  };

  return (
    <GoogleLogin
      useOneTap={false}
      ux_mode="popup"
      onSuccess={handleSuccess}
      onError={handleError}
      theme="outline"
      size="large"
      shape="rectangular"
      text="signin_with"
      {...rest}
    />
  );
}
