// src/components/GoogleButton.jsx
"use client";

import { GoogleLogin } from "@react-oauth/google";

/**
 * Thin wrapper around @react-oauth/google that simply forwards
 * the raw GIS payload to the parent (so pages can call your API
 * via the Next.js /api rewrite and set cookies on the correct domain).
 *
 * Usage:
 *   <GoogleButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
 *
 * onSuccess receives: { credential, clientId, select_by, ... }
 */
export default function GoogleButton({ onSuccess, onError, ...rest }) {
  const handleSuccess = (resp) => {
    if (typeof onSuccess === "function") onSuccess(resp);
    else console.log("[GoogleButton] success:", resp); // eslint-disable-line no-console
  };

  const handleError = (err) => {
    if (typeof onError === "function") onError(err);
    else console.error("[GoogleButton] error:", err); // eslint-disable-line no-console
  };

  return (
    <GoogleLogin
      useOneTap={false}
      ux_mode="popup"
      onSuccess={handleSuccess}
      onError={handleError}
      {...rest}
    />
  );
}
