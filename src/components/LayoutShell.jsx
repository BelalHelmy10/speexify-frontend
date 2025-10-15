// src/components/LayoutShell.jsx
"use client";

import React from "react";
// Adjust these imports to your actual header/footer components
// If your old Layout renders header/footer, import them from there:
import Header from "../../components/Header"; // e.g., src/components/Header.jsx
import Header from "../../components/Footer"; // e.g., src/components/Footer.jsx

export default function LayoutShell({ children }) {
  return (
    <>
      {/* If your Header needs props/context, keep it exactly like in your old Layout */}
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
