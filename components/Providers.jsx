// src/components/Providers.jsx
"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/hooks/useAuth";
import { getGoogleClientId } from "@/lib/googleAuth";

/**
 * Central place for all client providers.
 * - GoogleOAuthProvider: needed for @react-oauth/google
 * - AuthProvider: your app auth context
 */
export default function Providers({ children, initialUser, hasSessionCookie = false }) {
  const clientId = getGoogleClientId();

  if (!clientId) {
    // Don't crash the app; show a console hint in dev
    // eslint-disable-next-line no-console
    console.warn(
      "[Providers] NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing. Google login will not work."
    );
  }

  if (!clientId) {
    return (
      <AuthProvider initialUser={initialUser} hasSessionCookie={hasSessionCookie}>
        {children}
      </AuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider initialUser={initialUser} hasSessionCookie={hasSessionCookie}>
        {children}
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
