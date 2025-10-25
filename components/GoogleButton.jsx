// src/components/GoogleButton.jsx
"use client";

import { GoogleLogin } from "@react-oauth/google";
import { postGoogleLogin, getMe } from "@/lib/api"; // ✅ use helpers that always send cookies + no-store
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Google login button integrated with your backend via /api/auth/google.
 *
 * - Posts the credential to the backend (sets the session cookie).
 * - Immediately confirms the session with /api/auth/me (no cache).
 * - Redirects only after the user is authenticated to avoid flicker.
 */
export default function GoogleButton() {
  const router = useRouter();
  const params = useSearchParams();

  const handleSuccess = async ({ credential }) => {
    if (!credential) return;

    try {
      // 1) Ask backend to create the session cookie
      const res = await postGoogleLogin(credential);

      // 2) Confirm the cookie is active (fresh /me)
      const me = await getMe();

      if (res.data?.ok && me?.user) {
        console.log("[GoogleButton] Login success:", me.user);

        // 3) Navigate after we KNOW we're authenticated
        router.replace(params.get("next") || "/dashboard");
        router.refresh(); // App Router: re-render with auth state
      } else {
        console.error("[GoogleButton] Unexpected response:", res.data, me);
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
