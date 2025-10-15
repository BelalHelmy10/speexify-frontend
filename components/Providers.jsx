// src/components/Providers.jsx
"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/hooks/useAuth";

// Read from env at build/runtime
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function Providers({ children, initialUser }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* Seed auth with the server user so the Header is correct on first paint */}
      <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
    </GoogleOAuthProvider>
  );
}
