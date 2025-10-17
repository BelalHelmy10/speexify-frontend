// src/components/GoogleButton.jsx
"use client";

import { GoogleLogin } from "@react-oauth/google";
import api from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Google login button integrated with your backend via /api/auth/google.
 *
 * - Uses the same axios client as the rest of the app (cookies kept).
 * - Handles redirect after login automatically.
 * - Logs errors in dev for easier debugging.
 */
export default function GoogleButton() {
  const router = useRouter();
  const params = useSearchParams();

  const handleSuccess = async ({ credential }) => {
    if (!credential) return;

    try {
      // Send credential to backend through Next.js rewrite (/api → backend)
      const res = await api.post("/auth/google", { credential });

      // Expect { ok: true, user: {...} }
      if (res.data?.ok) {
        console.log("[GoogleButton] Login success:", res.data.user);
        // Redirect to intended page or dashboard
        router.replace(params.get("next") || "/dashboard");
      } else {
        console.error("[GoogleButton] Unexpected response:", res.data);
        alert("Login failed — please try again.");
      }
    } catch (err) {
      console.error("[GoogleButton] Login error:", err);
      alert("Google login failed — please try again.");
    }
  };

  const handleError = (err) => {
    console.error("[GoogleButton] OAuth popup error:", err);
    alert("Google sign-in was cancelled or failed.");
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
      width="280"
    />
  );
}
