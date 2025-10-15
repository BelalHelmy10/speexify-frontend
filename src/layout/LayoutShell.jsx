// src/layout/LayoutShell.jsx
"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "../hooks/useAuth";
import Header from "../../components/Header";
import Header from "../../components/Footer";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function LayoutShell({ children, withFooter = true }) {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <Header />
        <main className="site-main">{children}</main>
        {withFooter && <Footer />}
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
