// app/ClientShell.js
"use client";

import { useEffect, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/hooks/useAuth";
import { getGoogleClientId } from "@/lib/googleAuth";

export default function ClientShell({ children }) {
  const [googleClientId, setGoogleClientId] = useState(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
  );

  useEffect(() => {
    setGoogleClientId(getGoogleClientId());
  }, []);

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>{children}</AuthProvider>
    </GoogleOAuthProvider>
  );
}
