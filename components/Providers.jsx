// src/components/Providers.jsx
"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/hooks/useAuth";

/**
 * Central place for all client providers.
 * - GoogleOAuthProvider: needed for @react-oauth/google
 * - AuthProvider: your app auth context
 */
export default function Providers({ children, initialUser }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    // Don't crash the app; show a console hint in dev
    // eslint-disable-next-line no-console
    console.warn(
      "[Providers] NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing. Google login will not work."
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId || "missing-client-id"}>
      <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
    </GoogleOAuthProvider>
  );
}
