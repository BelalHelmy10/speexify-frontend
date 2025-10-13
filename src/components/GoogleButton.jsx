// src/components/GoogleButton.jsx
"use client";
import { GoogleLogin } from "@react-oauth/google";

export default function GoogleButton({ onSuccess, onError, ...rest }) {
  return (
    <GoogleLogin
      ux_mode="popup"
      useOneTap={false}
      onSuccess={(resp) => onSuccess?.({ credential: resp.credential })}
      onError={(err) => onError?.(err)}
      {...rest}
    />
  );
}
