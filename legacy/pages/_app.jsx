// src/pages/_app.jsx
import React from "react";

// Reuse your existing wrapper that sets up GoogleOAuthProvider, AuthProvider, etc.
import ClientShell from "@/app/ClientShell"; // path: src/pages/_app.jsx -> ../../app/ClientShell

export default function MyApp({ Component, pageProps }) {
  return (
    <ClientShell>
      <Component {...pageProps} />
    </ClientShell>
  );
}
