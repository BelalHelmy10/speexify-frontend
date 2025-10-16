// src/components/GoogleButton.jsx
"use client";

import { GoogleLogin } from "@react-oauth/google";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function GoogleButton({
  // optional overrides
  onSuccess,
  onError,
  // ...any other <GoogleLogin> props you want to pass
  ...rest
}) {
  async function defaultSuccess(resp) {
    try {
      const credential = resp?.credential;
      if (!credential) throw new Error("no_credential_from_gis");

      // POST to your backend and include cookies for the session
      const r = await fetch(`${API}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) {
        throw new Error(data?.error || `http_${r.status}`);
      }

      // success – refresh UI or call a callback if parent passed one
      // eslint-disable-next-line no-console
      console.log("[google] signed in", data.user);
      if (typeof onSuccess === "function") onSuccess(data);
      else window.location.reload();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[google] sign-in failed", e);
      if (typeof onError === "function") onError(e);
      else alert("Google sign-in failed");
    }
  }

  function defaultError(err) {
    // eslint-disable-next-line no-console
    console.error("[google] GIS error", err);
    if (typeof onError === "function") onError(err);
    else alert("Google sign-in failed");
  }

  return (
    <GoogleLogin
      useOneTap={false} // popup flow; avoids many blockers
      ux_mode="popup"
      onSuccess={defaultSuccess} // will call your onSuccess after backend says ok
      onError={defaultError}
      {...rest}
    />
  );
}
